import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildAllocatedJobs,
  buildMonthChartData,
  buildWeekChartData,
  buildWeeklyHighlight,
  buildYearChartData,
  sumAllocatedLbs,
} from '../server/utils/dashboard/weight-summary.mjs'

function job({
  jobKey,
  estimateKey,
  occurrenceKey,
  serviceDate,
  weightLbs,
  sourceClientId,
  sourceEstimateId,
}) {
  return {
    jobKey,
    estimateKey,
    occurrenceKey,
    serviceDate,
    weightLbs,
    sourceClientId,
    sourceEstimateId,
  }
}

test('buildAllocatedJobs splits multi-day weights across the full scheduled estimate window', () => {
  const allKnownJobs = [
    job({ jobKey: 'a1', estimateKey: 'est-1', occurrenceKey: 'est-1:2026-04-14', serviceDate: '2026-04-14', weightLbs: 9000 }),
    job({ jobKey: 'a2', estimateKey: 'est-1', occurrenceKey: 'est-1:2026-04-15', serviceDate: '2026-04-15', weightLbs: 9000 }),
    job({ jobKey: 'a3', estimateKey: 'est-1', occurrenceKey: 'est-1:2026-04-16', serviceDate: '2026-04-16', weightLbs: 9000 }),
  ]

  const rangeJobs = allKnownJobs.slice(0, 2)
  const allocatedJobs = buildAllocatedJobs(rangeJobs, allKnownJobs)

  assert.equal(allocatedJobs.length, 2)
  assert.deepEqual(
    allocatedJobs.map(job => job.allocatedWeightLbs),
    [3000, 3000],
  )
  assert.equal(sumAllocatedLbs(allocatedJobs), 6000)
})

test('buildAllocatedJobs dedupes duplicate occurrences before summing', () => {
  const allKnownJobs = [
    job({
      jobKey: 'dup-1',
      serviceDate: '2026-04-14',
      weightLbs: 4000,
      sourceClientId: 'client-1',
      sourceEstimateId: 'estimate-1',
    }),
    job({
      jobKey: 'dup-2',
      serviceDate: '2026-04-14',
      weightLbs: 4000,
      sourceClientId: 'client-1',
      sourceEstimateId: 'estimate-1',
    }),
  ]

  const allocatedJobs = buildAllocatedJobs(allKnownJobs, allKnownJobs)

  assert.equal(allocatedJobs.length, 1)
  assert.equal(sumAllocatedLbs(allocatedJobs), 4000)
})

test('week and month summaries only count the portion of multi-day work that has occurred by today', () => {
  const allKnownJobs = [
    job({ jobKey: 'apr1', estimateKey: 'est-single', occurrenceKey: 'est-single:2026-04-01', serviceDate: '2026-04-01', weightLbs: 2000 }),
    job({ jobKey: 'apr15', estimateKey: 'est-span', occurrenceKey: 'est-span:2026-04-15', serviceDate: '2026-04-15', weightLbs: 9000 }),
    job({ jobKey: 'apr16', estimateKey: 'est-span', occurrenceKey: 'est-span:2026-04-16', serviceDate: '2026-04-16', weightLbs: 9000 }),
    job({ jobKey: 'apr17', estimateKey: 'est-span', occurrenceKey: 'est-span:2026-04-17', serviceDate: '2026-04-17', weightLbs: 9000 }),
    job({ jobKey: 'apr18', estimateKey: 'est-week', occurrenceKey: 'est-week:2026-04-18', serviceDate: '2026-04-18', weightLbs: 5000 }),
  ]

  const weekRangeJobs = allKnownJobs.filter(job => ['2026-04-15', '2026-04-16', '2026-04-17', '2026-04-18'].includes(job.serviceDate))
  const weekAllocatedJobs = buildAllocatedJobs(weekRangeJobs, allKnownJobs)
  const weekChart = buildWeekChartData(weekAllocatedJobs, '2026-04-13')
  const highlights = buildWeeklyHighlight(weekChart, '2026-04-16', '2026-04-13')

  assert.equal(sumAllocatedLbs(weekAllocatedJobs), 14000)
  assert.equal(highlights.today, 3000)
  assert.equal(highlights.remaining, 8000)

  const monthToDateRangeJobs = allKnownJobs.filter(job => job.serviceDate <= '2026-04-16')
  const monthAllocatedJobs = buildAllocatedJobs(monthToDateRangeJobs, allKnownJobs)
  const monthChart = buildMonthChartData(monthAllocatedJobs, '2026-04-01', '2026-04-16')

  assert.equal(sumAllocatedLbs(monthAllocatedJobs), 8000)
  assert.equal(monthChart.at(-1)?.label, 'Apr 13-16')
  assert.equal(monthChart.reduce((sum, point) => sum + point.pounds, 0), 8000)
})

test('year chart stays year-to-date and buckets by month', () => {
  const allKnownJobs = [
    job({ jobKey: 'jan', estimateKey: 'jan-est', occurrenceKey: 'jan-est:2026-01-20', serviceDate: '2026-01-20', weightLbs: 2500 }),
    job({ jobKey: 'apr15', estimateKey: 'apr-est', occurrenceKey: 'apr-est:2026-04-15', serviceDate: '2026-04-15', weightLbs: 6000 }),
    job({ jobKey: 'apr16', estimateKey: 'apr-est', occurrenceKey: 'apr-est:2026-04-16', serviceDate: '2026-04-16', weightLbs: 6000 }),
    job({ jobKey: 'apr17', estimateKey: 'apr-est', occurrenceKey: 'apr-est:2026-04-17', serviceDate: '2026-04-17', weightLbs: 6000 }),
  ]

  const yearToDateRangeJobs = allKnownJobs.filter(job => job.serviceDate <= '2026-04-16')
  const yearAllocatedJobs = buildAllocatedJobs(yearToDateRangeJobs, allKnownJobs)
  const yearChart = buildYearChartData(yearAllocatedJobs, '2026-01-01', '2026-04-16')

  assert.equal(sumAllocatedLbs(yearAllocatedJobs), 6500)
  assert.deepEqual(yearChart.map(point => point.label), ['Jan', 'Feb', 'Mar', 'Apr'])
  assert.deepEqual(yearChart.map(point => point.pounds), [2500, 0, 0, 4000])
})
