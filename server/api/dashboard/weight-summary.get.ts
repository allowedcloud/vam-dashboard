interface BackendRangeJob {
  jobKey: string
  estimateKey?: string
  occurrenceKey?: string
  serviceDate?: string
  sourceClientId?: string
  sourceEstimateId?: string
  weightLbs?: number
}

interface BackendRangeResponse {
  from: string
  to: string
  jobs: BackendRangeJob[]
}

interface BackendMonthlyStatsResponse {
  month: string
  movesThisMonth?: number
  avgMoveValueThisMonth?: number
  updatedAt?: string | null
}

interface AllocatedJob extends BackendRangeJob {
  allocatedWeightLbs: number
  canonicalEstimateKey: string
  canonicalOccurrenceKey: string
}

interface ChartDatum {
  label: string
  pounds: number
}

interface WeeklyHighlight {
  today: number
  remaining: number
}

function toIsoDateInTimezone(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const parts = formatter.formatToParts(date)
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? ''

  return `${get('year')}-${get('month')}-${get('day')}`
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

function getWeekStart(todayIso: string) {
  const [year, month, day] = todayIso.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  const dayOfWeek = date.getUTCDay()
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  return addDays(date, diffToMonday)
}

function getMonthStart(todayIso: string) {
  const [year, month] = todayIso.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, 1))
}

function getMonthEnd(todayIso: string) {
  const [year, month] = todayIso.split('-').map(Number)
  return new Date(Date.UTC(year, month, 0))
}

function getYearStart(todayIso: string) {
  const [year] = todayIso.split('-').map(Number)
  return new Date(Date.UTC(year, 0, 1))
}

function toCanonicalOccurrenceKey(job: BackendRangeJob) {
  if (job.occurrenceKey) {
    return job.occurrenceKey
  }

  if (job.sourceClientId && job.sourceEstimateId && job.serviceDate) {
    return `${job.sourceClientId}:${job.sourceEstimateId}:${job.serviceDate}`
  }

  return job.jobKey
}

function toCanonicalEstimateKey(job: BackendRangeJob) {
  if (job.estimateKey) {
    return job.estimateKey
  }

  if (job.sourceClientId && job.sourceEstimateId) {
    return `${job.sourceClientId}:${job.sourceEstimateId}`
  }

  return toCanonicalOccurrenceKey(job)
}

function dedupeJobs(jobs: BackendRangeJob[]) {
  const seen = new Set<string>()

  return jobs.filter((job) => {
    const canonicalKey = toCanonicalOccurrenceKey(job)

    if (seen.has(canonicalKey)) {
      return false
    }

    seen.add(canonicalKey)
    return true
  })
}

function buildAllocatedJobs(rangeJobs: BackendRangeJob[], allKnownJobs: BackendRangeJob[]) {
  const dedupedRangeJobs = dedupeJobs(rangeJobs)
  const dedupedAllKnownJobs = dedupeJobs(allKnownJobs)
  const daysByEstimate = new Map<string, Set<string>>()

  for (const job of dedupedAllKnownJobs) {
    if (!job.serviceDate) {
      continue
    }

    const estimateKey = toCanonicalEstimateKey(job)
    const dates = daysByEstimate.get(estimateKey) ?? new Set<string>()
    dates.add(job.serviceDate)
    daysByEstimate.set(estimateKey, dates)
  }

  const occurrencesByEstimate = new Map<string, BackendRangeJob[]>()

  for (const job of dedupedRangeJobs) {
    const estimateKey = toCanonicalEstimateKey(job)
    const jobs = occurrencesByEstimate.get(estimateKey) ?? []
    jobs.push(job)
    occurrencesByEstimate.set(estimateKey, jobs)
  }

  const allocatedJobs: AllocatedJob[] = []

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

function sumAllocatedLbs(rangeJobs: BackendRangeJob[], allKnownJobs: BackendRangeJob[]) {
  return Math.round(
    buildAllocatedJobs(rangeJobs, allKnownJobs)
      .reduce((total, job) => total + job.allocatedWeightLbs, 0),
  )
}

function startOfWeek(date: Date) {
  const next = new Date(date)
  const dayOfWeek = next.getUTCDay()
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  next.setUTCDate(next.getUTCDate() + diffToMonday)
  return next
}

function endOfWeek(date: Date) {
  return addDays(startOfWeek(date), 6)
}

function formatMonthDay(date: Date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

function formatMonthShort(date: Date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    timeZone: 'UTC',
  }).format(date)
}

function formatWeekdayShort(date: Date) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    timeZone: 'UTC',
  }).format(date)
}

function parseIsoDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

function daysBetweenIso(startDate: string, endDate: string) {
  const start = parseIsoDate(startDate)
  const end = parseIsoDate(endDate)
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)))
}

function buildWeekChartData(allocatedJobs: AllocatedJob[], weekStartIso: string) {
  const buckets = new Map<string, number>()

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

function buildWeeklyHighlight(weeklyChartData: ChartDatum[], todayIso: string, weekStartIso: string): WeeklyHighlight {
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

function buildMonthChartData(allocatedJobs: AllocatedJob[], monthStartIso: string, todayIso: string) {
  const monthStart = parseIsoDate(monthStartIso)
  const today = parseIsoDate(todayIso)
  const dailyTotals = new Map<string, number>()

  for (const job of allocatedJobs) {
    if (!job.serviceDate) {
      continue
    }
    dailyTotals.set(job.serviceDate, (dailyTotals.get(job.serviceDate) ?? 0) + job.allocatedWeightLbs)
  }

  const buckets = new Map<string, ChartDatum>()

  for (
    let cursor = new Date(monthStart);
    cursor.getTime() <= today.getTime();
    cursor = addDays(cursor, 1)
  ) {
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

  return Array.from(buckets.values()).map((bucket) => ({
    label: bucket.label,
    pounds: Math.round(bucket.pounds),
  }))
}

function buildYearChartData(allocatedJobs: AllocatedJob[], yearStartIso: string, todayIso: string) {
  const [startYear] = yearStartIso.split('-').map(Number)
  const [, endMonth] = todayIso.split('-').map(Number)
  const buckets = new Map<number, number>()

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

async function fetchRange(baseUrl: string, token: string, from: string, to: string) {
  return await $fetch<BackendRangeResponse>('/jobs/range', {
    baseURL: baseUrl,
    headers: {
      Authorization: `Bearer ${token}`,
    },
    query: { from, to },
  })
}

async function fetchMonthlyStats(baseUrl: string, token: string, month: string) {
  return await $fetch<BackendMonthlyStatsResponse>('/dashboard/monthly-stats', {
    baseURL: baseUrl,
    headers: {
      Authorization: `Bearer ${token}`,
    },
    query: { month },
  })
}

export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  const baseUrl = config.mipBackendBaseUrl
  const token = config.mipBackendApiToken

  if (!baseUrl || !token) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Missing backend configuration',
    })
  }

  const timeZone = 'America/New_York'
  const todayIso = toIsoDateInTimezone(new Date(), timeZone)
  const weekStart = getWeekStart(todayIso)
  const weekEndIso = toIsoDateInTimezone(addDays(weekStart, 6), 'UTC')
  const yearStartIso = toIsoDateInTimezone(getYearStart(todayIso), 'UTC')
  const monthStartIso = toIsoDateInTimezone(getMonthStart(todayIso), 'UTC')
  const monthEndIso = toIsoDateInTimezone(getMonthEnd(todayIso), 'UTC')
  const allocationHorizonEndIso = toIsoDateInTimezone(addDays(getMonthEnd(todayIso), 13), 'UTC')

  const monthKey = todayIso.slice(0, 7)

  const [week, month, year, allocationHorizon, monthlyStats] = await Promise.all([
    fetchRange(baseUrl, token, toIsoDateInTimezone(weekStart, 'UTC'), weekEndIso),
    fetchRange(baseUrl, token, monthStartIso, monthEndIso),
    fetchRange(baseUrl, token, yearStartIso, todayIso),
    fetchRange(baseUrl, token, yearStartIso, allocationHorizonEndIso),
    fetchMonthlyStats(baseUrl, token, monthKey),
  ])

  const allocatedWeekJobs = buildAllocatedJobs(week.jobs, allocationHorizon.jobs)
  const allocatedMonthJobs = buildAllocatedJobs(month.jobs, allocationHorizon.jobs)
  const allocatedYearJobs = buildAllocatedJobs(year.jobs, allocationHorizon.jobs)
  const weekChartData = buildWeekChartData(allocatedWeekJobs, toIsoDateInTimezone(weekStart, 'UTC'))

  return {
    updatedAt: new Date().toISOString(),
    ranges: {
      week: { from: week.from, to: week.to },
      month: { from: month.from, to: month.to },
      year: { from: year.from, to: year.to },
    },
    pounds: {
      week: Math.round(allocatedWeekJobs.reduce((total, job) => total + job.allocatedWeightLbs, 0)),
      month: Math.round(allocatedMonthJobs.reduce((total, job) => total + job.allocatedWeightLbs, 0)),
      year: Math.round(allocatedYearJobs.reduce((total, job) => total + job.allocatedWeightLbs, 0)),
    },
    monthlyStats: {
      movesThisMonth: monthlyStats.movesThisMonth ?? 0,
      avgMoveValueThisMonth: Math.round(monthlyStats.avgMoveValueThisMonth ?? 0),
      updatedAt: monthlyStats.updatedAt ?? null,
    },
    weeklyHighlights: buildWeeklyHighlight(weekChartData, todayIso, toIsoDateInTimezone(weekStart, 'UTC')),
    charts: {
      week: weekChartData,
      month: buildMonthChartData(allocatedMonthJobs, monthStartIso, monthEndIso),
      year: buildYearChartData(allocatedYearJobs, yearStartIso, todayIso),
    },
  }
})
