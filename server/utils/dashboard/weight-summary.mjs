function toIsoDateInTimezone(date, timeZone) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const parts = formatter.formatToParts(date)
  const get = type => parts.find(part => part.type === type)?.value ?? ''

  return `${get('year')}-${get('month')}-${get('day')}`
}

function addDays(date, days) {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

function getWeekStart(todayIso) {
  const [year, month, day] = todayIso.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  const dayOfWeek = date.getUTCDay()
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  return addDays(date, diffToMonday)
}

function getMonthStart(todayIso) {
  const [year, month] = todayIso.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, 1))
}

function getMonthEnd(todayIso) {
  const [year, month] = todayIso.split('-').map(Number)
  return new Date(Date.UTC(year, month, 0))
}

function getYearStart(todayIso) {
  const [year] = todayIso.split('-').map(Number)
  return new Date(Date.UTC(year, 0, 1))
}

function toCanonicalOccurrenceKey(job) {
  if (job.occurrenceKey) {
    return job.occurrenceKey
  }

  if (job.sourceClientId && job.sourceEstimateId && job.serviceDate) {
    return `${job.sourceClientId}:${job.sourceEstimateId}:${job.serviceDate}`
  }

  return job.jobKey
}

function toCanonicalEstimateKey(job) {
  if (job.estimateKey) {
    return job.estimateKey
  }

  if (job.sourceClientId && job.sourceEstimateId) {
    return `${job.sourceClientId}:${job.sourceEstimateId}`
  }

  return toCanonicalOccurrenceKey(job)
}

function dedupeJobs(jobs) {
  const seen = new Set()

  return jobs.filter((job) => {
    const canonicalKey = toCanonicalOccurrenceKey(job)

    if (seen.has(canonicalKey)) {
      return false
    }

    seen.add(canonicalKey)
    return true
  })
}

function buildAllocatedJobs(rangeJobs, allKnownJobs) {
  const dedupedRangeJobs = dedupeJobs(rangeJobs)
  const dedupedAllKnownJobs = dedupeJobs(allKnownJobs)
  const daysByEstimate = new Map()

  for (const job of dedupedAllKnownJobs) {
    if (!job.serviceDate) {
      continue
    }

    const estimateKey = toCanonicalEstimateKey(job)
    const dates = daysByEstimate.get(estimateKey) ?? new Set()
    dates.add(job.serviceDate)
    daysByEstimate.set(estimateKey, dates)
  }

  const occurrencesByEstimate = new Map()

  for (const job of dedupedRangeJobs) {
    const estimateKey = toCanonicalEstimateKey(job)
    const jobs = occurrencesByEstimate.get(estimateKey) ?? []
    jobs.push(job)
    occurrencesByEstimate.set(estimateKey, jobs)
  }

  const allocatedJobs = []

  for (const [estimateKey, jobs] of occurrencesByEstimate.entries()) {
    const weightLbs = typeof jobs[0]?.weightLbs === 'number' && jobs[0].weightLbs > 0 ? jobs[0].weightLbs : 0

    if (weightLbs <= 0) {
      continue
    }

    const totalScheduledDays = Math.max(daysByEstimate.get(estimateKey)?.size ?? 0, 1)

    for (const job of jobs) {
      allocatedJobs.push({
        ...job,
        canonicalEstimateKey: estimateKey,
        canonicalOccurrenceKey: toCanonicalOccurrenceKey(job),
        allocatedWeightLbs: weightLbs / totalScheduledDays,
      })
    }
  }

  return allocatedJobs
}

function startOfWeek(date) {
  const next = new Date(date)
  const dayOfWeek = next.getUTCDay()
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  next.setUTCDate(next.getUTCDate() + diffToMonday)
  return next
}

function endOfWeek(date) {
  return addDays(startOfWeek(date), 6)
}

function formatMonthDay(date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

function formatMonthShort(date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    timeZone: 'UTC',
  }).format(date)
}

function formatWeekdayShort(date) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    timeZone: 'UTC',
  }).format(date)
}

function parseIsoDate(value) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

function daysBetweenIso(startDate, endDate) {
  const start = parseIsoDate(startDate)
  const end = parseIsoDate(endDate)
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)))
}

function buildWeekChartData(allocatedJobs, weekStartIso) {
  const buckets = new Map()

  for (let offset = 0; offset < 7; offset += 1) {
    const day = addDays(parseIsoDate(weekStartIso), offset)
    buckets.set(toIsoDateInTimezone(day, 'UTC'), 0)
  }

  for (const job of allocatedJobs) {
    if (!job.serviceDate) {
      continue
    }

    buckets.set(job.serviceDate, (buckets.get(job.serviceDate) ?? 0) + job.allocatedWeightLbs)
  }

  return Array.from(buckets.entries()).map(([isoDate, pounds]) => ({
    label: formatWeekdayShort(parseIsoDate(isoDate)),
    pounds: Math.round(pounds),
  }))
}

function buildWeeklyHighlight(weeklyChartData, todayIso, weekStartIso) {
  const todayIndex = Math.max(0, Math.min(6, daysBetweenIso(weekStartIso, todayIso)))
  const today = weeklyChartData[todayIndex]?.pounds ?? 0
  const remaining = weeklyChartData
    .slice(todayIndex + 1)
    .reduce((total, point) => total + point.pounds, 0)

  return {
    today,
    remaining,
  }
}

function buildMonthChartData(allocatedJobs, monthStartIso, todayIso) {
  const monthStart = parseIsoDate(monthStartIso)
  const today = parseIsoDate(todayIso)
  const dailyTotals = new Map()

  for (const job of allocatedJobs) {
    if (!job.serviceDate) {
      continue
    }

    dailyTotals.set(job.serviceDate, (dailyTotals.get(job.serviceDate) ?? 0) + job.allocatedWeightLbs)
  }

  const buckets = new Map()

  for (let cursor = new Date(monthStart); cursor.getTime() <= today.getTime(); cursor = addDays(cursor, 1)) {
    const dayIso = toIsoDateInTimezone(cursor, 'UTC')
    const bucketStart = new Date(Math.max(startOfWeek(cursor).getTime(), monthStart.getTime()))
    const bucketEnd = new Date(Math.min(endOfWeek(cursor).getTime(), today.getTime()))
    const bucketKey = `${toIsoDateInTimezone(bucketStart, 'UTC')}|${toIsoDateInTimezone(bucketEnd, 'UTC')}`
    const label = bucketStart.getTime() === bucketEnd.getTime()
      ? formatMonthDay(bucketStart)
      : `${formatMonthDay(bucketStart)}-${bucketEnd.getUTCDate()}`
    const bucket = buckets.get(bucketKey) ?? { label, pounds: 0 }
    bucket.pounds += dailyTotals.get(dayIso) ?? 0
    buckets.set(bucketKey, bucket)
  }

  return Array.from(buckets.values()).map(bucket => ({
    label: bucket.label,
    pounds: Math.round(bucket.pounds),
  }))
}

function buildYearChartData(allocatedJobs, yearStartIso, todayIso) {
  const [startYear] = yearStartIso.split('-').map(Number)
  const [, endMonth] = todayIso.split('-').map(Number)
  const buckets = new Map()

  for (let month = 0; month < endMonth; month += 1) {
    buckets.set(month, 0)
  }

  for (const job of allocatedJobs) {
    if (!job.serviceDate) {
      continue
    }

    const serviceDate = parseIsoDate(job.serviceDate)
    if (serviceDate.getUTCFullYear() !== startYear) {
      continue
    }

    const monthIndex = serviceDate.getUTCMonth()
    buckets.set(monthIndex, (buckets.get(monthIndex) ?? 0) + job.allocatedWeightLbs)
  }

  return Array.from(buckets.entries()).map(([monthIndex, pounds]) => ({
    label: formatMonthShort(new Date(Date.UTC(startYear, monthIndex, 1))),
    pounds: Math.round(pounds),
  }))
}

function sumAllocatedLbs(allocatedJobs) {
  return Math.round(allocatedJobs.reduce((total, job) => total + job.allocatedWeightLbs, 0))
}

export {
  addDays,
  buildAllocatedJobs,
  buildMonthChartData,
  buildWeekChartData,
  buildWeeklyHighlight,
  buildYearChartData,
  daysBetweenIso,
  dedupeJobs,
  getMonthEnd,
  getMonthStart,
  getWeekStart,
  getYearStart,
  parseIsoDate,
  sumAllocatedLbs,
  toCanonicalEstimateKey,
  toCanonicalOccurrenceKey,
  toIsoDateInTimezone,
}
