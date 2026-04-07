interface BackendCalendarJob {
  jobKey: string
  estimateKey?: string
  occurrenceKey?: string
  serviceDate?: string
  contactName?: string
  origin?: string
  originFull?: string
  originCity?: string
  destination?: string
  destinationFull?: string
  destinationCity?: string
  movingTrucks?: number
  crewSize?: number
  packingHours?: number
  estimateCost?: number
  weightLbs?: number
  multiDayDayNumber?: number
  multiDayDayCount?: number
  activityType?: string
}

interface BackendRangeResponse {
  from: string
  to: string
  jobs: BackendCalendarJob[]
}

interface CalendarJobCard {
  jobKey: string
  contactName: string
  originTown: string
  destinationTown: string
  weightLabel: string
  crewLabel: string
  truckLabel: string
  packingLabel?: string
  costLabel: string
  dayLabel?: string
}

function toIsoDateInTimezone(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const parts = formatter.formatToParts(date)
  const get = (type: string) => parts.find(part => part.type === type)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}`
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

function parseIsoDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

function getWeekStart(todayIso: string) {
  const date = parseIsoDate(todayIso)
  const dayOfWeek = date.getUTCDay()
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  return addDays(date, diffToMonday)
}

function formatWeekdayLabel(isoDate: string) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(parseIsoDate(isoDate))
}

function formatTodayLabel(isoDate: string) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(parseIsoDate(isoDate))
}

function currencyLabel(value?: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(typeof value === 'number' ? value : 0)
}

function poundsLabel(value?: number) {
  return `${new Intl.NumberFormat('en-US').format(typeof value === 'number' ? Math.round(value) : 0)} lbs`
}

function cleanAddress(value?: string) {
  if (!value) {
    return ''
  }

  return value
    .replace(/Click Here For More Details\.?/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractTown(value?: string) {
  const cleaned = cleanAddress(value)
  if (!cleaned) {
    return 'Unknown'
  }

  const normalized = cleaned
    .replace(/\s+TYPE:.*$/i, '')
    .replace(/\s+FLOOR:.*$/i, '')
    .replace(/\s+STAIRS.*$/i, '')
    .replace(/\s+SUITE\/APT:\s*[A-Z0-9-]+/gi, '')
    .replace(/\s+/g, ' ')
    .trim()

  const commaParts = normalized.split(',').map(part => part.trim()).filter(Boolean)
  const vaIndex = commaParts.findIndex(part => /\bVA\b/i.test(part) || /\bVirginia\b/i.test(part))
  if (vaIndex > 0) {
    return commaParts[vaIndex - 1]
  }

  if (commaParts.length >= 3 && /^\d{5}(?:-\d{4})?$/.test(commaParts[commaParts.length - 1])) {
    return commaParts[commaParts.length - 3]
  }

  const cityStateMatch = normalized.match(/,\s*([^,]+?)\s*,?\s*VA\b/i)
  if (cityStateMatch?.[1]) {
    return cityStateMatch[1].trim()
  }

  const cityVirginiaMatch = normalized.match(/([A-Za-z.' -]+?)\s*,?\s*VIRGINIA\s+\d{5}/i)
  if (cityVirginiaMatch?.[1]) {
    const candidate = cityVirginiaMatch[1].trim().split(',').pop()?.trim() || cityVirginiaMatch[1].trim()
    return candidate
  }

  const tokens = normalized.match(/([A-Za-z.' -]+?)\s+VA\s+\d{5}/i)
  if (tokens?.[1]) {
    const candidate = tokens[1].trim().split(',').pop()?.trim() || tokens[1].trim()
    return candidate
  }

  return commaParts[1] || commaParts[0] || normalized || 'Unknown'
}

function toTruckCount(job: BackendCalendarJob) {
  if (typeof job.movingTrucks === 'number' && job.movingTrucks > 0) {
    return Math.round(job.movingTrucks)
  }

  return typeof job.weightLbs === 'number' && job.weightLbs > 10000 ? 2 : 1
}

function toCalendarJob(job: BackendCalendarJob): CalendarJobCard {
  const originTown = job.originCity || extractTown(job.originFull || job.origin)
  const destinationTown = job.destinationCity || extractTown(job.destinationFull || job.destination)
  const packingHours = typeof job.packingHours === 'number' && job.packingHours > 0
    ? job.packingHours
    : undefined
  const truckCount = toTruckCount(job)
  const activity = job.activityType
    ? `${job.activityType.charAt(0).toUpperCase()}${job.activityType.slice(1)}`
    : undefined
  const dayLabel = job.multiDayDayNumber && job.multiDayDayCount
    ? (
        job.multiDayDayCount > 1
          ? `${job.multiDayDayNumber}/${job.multiDayDayCount}${activity ? ` ${activity}` : ''}`
          : activity
      )
    : activity

  return {
    jobKey: job.occurrenceKey || job.jobKey,
    contactName: job.contactName || 'Unnamed move',
    originTown,
    destinationTown,
    weightLabel: poundsLabel(job.weightLbs),
    crewLabel: `${typeof job.crewSize === 'number' && job.crewSize > 0 ? job.crewSize : 0} crew`,
    truckLabel: `${truckCount} truck${truckCount === 1 ? '' : 's'}`,
    packingLabel: packingHours ? `${packingHours} packing hrs` : undefined,
    costLabel: currencyLabel(job.estimateCost),
    dayLabel,
  }
}

function sortJobs(jobs: BackendCalendarJob[]) {
  return [...jobs].sort((a, b) => {
    const weightA = typeof a.weightLbs === 'number' ? a.weightLbs : 0
    const weightB = typeof b.weightLbs === 'number' ? b.weightLbs : 0
    return weightB - weightA
  })
}

export default defineEventHandler(async () => {
  const runtimeConfig = useRuntimeConfig()
  const baseUrl = runtimeConfig.mipBackendBaseUrl
  const token = runtimeConfig.mipBackendApiToken

  if (!baseUrl || !token) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Missing backend configuration',
    })
  }

  const timeZone = 'America/New_York'
  const todayIso = toIsoDateInTimezone(new Date(), timeZone)
  const weekStart = getWeekStart(todayIso)
  const weekEnd = addDays(weekStart, 6)
  const from = toIsoDateInTimezone(weekStart, 'UTC')
  const to = toIsoDateInTimezone(weekEnd, 'UTC')

  const range = await $fetch<BackendRangeResponse>('/jobs/range', {
    baseURL: baseUrl,
    headers: {
      Authorization: `Bearer ${token}`,
    },
    query: { from, to },
  })

  const todayJobs = sortJobs(range.jobs.filter(job => job.serviceDate === todayIso)).map(toCalendarJob)
  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(weekStart, index)
    const isoDate = toIsoDateInTimezone(date, 'UTC')
    const jobs = sortJobs(range.jobs.filter(job => job.serviceDate === isoDate)).map(toCalendarJob)

    return {
      isoDate,
      label: formatWeekdayLabel(isoDate),
      jobs,
    }
  })

  return {
    todayIso,
    todayLabel: formatTodayLabel(todayIso),
    todayJobs,
    weekDays,
  }
})
