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

import {
  addDays,
  buildAllocatedJobs,
  buildMonthChartData,
  buildWeekChartData,
  buildWeeklyHighlight,
  buildYearChartData,
  getMonthEnd,
  getMonthStart,
  getWeekStart,
  getYearStart,
  sumAllocatedLbs,
  toIsoDateInTimezone,
} from '../../utils/dashboard/weight-summary.mjs'

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
    fetchRange(baseUrl, token, monthStartIso, todayIso),
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
      week: sumAllocatedLbs(allocatedWeekJobs),
      month: sumAllocatedLbs(allocatedMonthJobs),
      year: sumAllocatedLbs(allocatedYearJobs),
    },
    monthlyStats: {
      movesThisMonth: monthlyStats.movesThisMonth ?? 0,
      avgMoveValueThisMonth: Math.round(monthlyStats.avgMoveValueThisMonth ?? 0),
      updatedAt: monthlyStats.updatedAt ?? null,
    },
    weeklyHighlights: buildWeeklyHighlight(weekChartData, todayIso, toIsoDateInTimezone(weekStart, 'UTC')),
    charts: {
      week: weekChartData,
      month: buildMonthChartData(allocatedMonthJobs, monthStartIso, todayIso),
      year: buildYearChartData(allocatedYearJobs, yearStartIso, todayIso),
    },
  }
})
