<script setup lang="ts">
import { useFetch } from '#app'
import { useElementSize } from '@vueuse/core'
import { computed } from 'vue'
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudMoon,
  CloudRain,
  CloudSnow,
  CloudSun,
  MoonStar,
  SunMedium,
} from 'lucide-vue-next'
import { VisAxis, VisGroupedBar, VisLine, VisXYContainer } from '@unovis/vue'
import InstagramFeed from '~/components/dashboard/InstagramFeed.vue'
import RegionalMoveMap from '~/components/dashboard/RegionalMoveMap.vue'

interface ChartPoint {
  label: string
  pounds: number
}

interface WeatherResponse {
  location: string
  current: {
    temperature: number
    apparentTemperature: number
    condition: string
    iconKey: keyof typeof weatherIcons
  }
  today: {
    high: number
    low: number
  }
  periods: Array<{
    label: string
    temperature: number | null
    iconKey: keyof typeof weatherIcons
  }>
}

interface MapDestinationsResponse {
  totals: {
    completedMoves: number
    virginiaDestinations: number
    geocodedDestinations: number
  }
  points: Array<{
    latitude: number
    longitude: number
    moveCount: number
  }>
  sampleDestinations: Array<{
    destination: string
    moveCount: number
  }>
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

interface CalendarsResponse {
  todayIso: string
  todayLabel: string
  todayJobs: CalendarJobCard[]
  weekDays: Array<{
    isoDate: string
    label: string
    jobs: CalendarJobCard[]
  }>
}

interface InstagramFeedFrame {
  id: string
  mediaType: 'IMAGE' | 'VIDEO'
  imageUrl: string | null
  permalink: string
}

interface InstagramFeedPost {
  id: string
  caption: string
  mediaType: string
  permalink: string
  timestamp: string | null
  frameCount: number
  frames: InstagramFeedFrame[]
}

interface InstagramFeedResponse {
  accountHandle: string
  posts: InstagramFeedPost[]
}

const weatherIcons = {
  'clear-day': SunMedium,
  'clear-night': MoonStar,
  'partly-cloudy-day': CloudSun,
  'partly-cloudy-night': CloudMoon,
  cloudy: Cloud,
  fog: CloudFog,
  drizzle: CloudDrizzle,
  rain: CloudRain,
  snow: CloudSnow,
  storm: CloudLightning,
} as const

const [
  { data: summaryData, pending: summaryPending, error: summaryError },
  { data: weatherData, pending: weatherPending, error: weatherError },
  { data: calendarsData, pending: calendarsPending, error: calendarsError },
  { data: instagramData, pending: instagramPending, error: instagramError },
] = await Promise.all([
  useFetch('/api/dashboard/weight-summary'),
  useFetch<WeatherResponse>('/api/dashboard/weather'),
  useFetch<CalendarsResponse>('/api/dashboard/calendars'),
  useFetch<InstagramFeedResponse>('/api/dashboard/instagram'),
])

const { data: mapData, pending: mapPending, error: mapError } = useFetch<MapDestinationsResponse>('/api/dashboard/map-destinations', {
  server: false,
  default: () => ({
    totals: {
      completedMoves: 0,
      virginiaDestinations: 0,
      geocodedDestinations: 0,
    },
    points: [],
    sampleDestinations: [],
  }),
})

const poundFormatter = new Intl.NumberFormat('en-US')
const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

const chartConfig = {
  pounds: {
    label: 'Pounds',
    color: 'var(--color-brand)',
  },
}

const weekChartElement = useTemplateRef<HTMLDivElement>('weekChartElement')

const { height: weekChartElementHeight } = useElementSize(weekChartElement)

const weekChartHeight = computed(() => Math.max(176, Math.round(weekChartElementHeight.value) - 10))
const { date, time } = useClock()

const topCards = computed(() => {
  const pounds = summaryData.value?.pounds
  const charts = summaryData.value?.charts
  const monthlyStats = summaryData.value?.monthlyStats
  const weeklyHighlights = summaryData.value?.weeklyHighlights

  const toIndexed = (points?: ChartPoint[]) => (points ?? []).map((point, index) => ({ ...point, index }))

  return {
    week: {
      label: 'This week',
      value: `${poundFormatter.format(pounds?.week ?? 0)} lbs`,
      today: `${poundFormatter.format(weeklyHighlights?.today ?? 0)} lbs`,
      remaining: `${poundFormatter.format(weeklyHighlights?.remaining ?? 0)} lbs`,
      chart: toIndexed(charts?.week),
    },
    month: {
      label: 'This month',
      value: `${poundFormatter.format(pounds?.month ?? 0)} lbs`,
      movesThisMonth: poundFormatter.format(monthlyStats?.movesThisMonth ?? 0),
      avgMoveValueThisMonth: currencyFormatter.format(monthlyStats?.avgMoveValueThisMonth ?? 0),
      chart: toIndexed(charts?.month),
    },
    year: {
      label: 'Year to date',
      value: `${poundFormatter.format(pounds?.year ?? 0)} lbs`,
      chart: toIndexed(charts?.year),
    },
  }
})

const weatherCard = computed(() => {
  const weather = weatherData.value
  const fallbackIcon = weatherIcons.cloudy

  return {
    location: weather?.location ?? 'Williamsburg, VA',
    temperature: `${weather?.current.temperature ?? 0}°`,
    apparentTemperature: `${weather?.current.apparentTemperature ?? 0}°`,
    condition: weather?.current.condition ?? 'Unavailable',
    highLow: `H ${weather?.today.high ?? 0}°  L ${weather?.today.low ?? 0}°`,
    icon: weather ? weatherIcons[weather.current.iconKey] : fallbackIcon,
    periods: (weather?.periods ?? []).map(period => ({
      ...period,
      displayTemp: typeof period.temperature === 'number' ? `${period.temperature}°` : '--',
      icon: weatherIcons[period.iconKey] ?? fallbackIcon,
    })),
  }
})

const mapCard = computed(() => ({
  points: mapData.value?.points ?? [],
}))

const calendarsCard = computed(() => ({
  todayIso: calendarsData.value?.todayIso ?? '',
  todayLabel: calendarsData.value?.todayLabel ?? 'Today',
  todayJobs: calendarsData.value?.todayJobs ?? [],
  weekDays: calendarsData.value?.weekDays ?? [],
}))

const MAX_TODAY_JOBS = 4
const MAX_WEEKLY_JOBS_PER_DAY = 2

const visibleTodayJobs = computed(() => calendarsCard.value.todayJobs.slice(0, MAX_TODAY_JOBS))
const hiddenTodayJobs = computed(() => Math.max(0, calendarsCard.value.todayJobs.length - visibleTodayJobs.value.length))

const weeklyCalendarDays = computed(() => calendarsCard.value.weekDays.map(day => ({
  ...day,
  visibleJobs: day.jobs.slice(0, MAX_WEEKLY_JOBS_PER_DAY),
  hiddenJobs: Math.max(0, day.jobs.length - MAX_WEEKLY_JOBS_PER_DAY),
})))

const instagramCard = computed(() => ({
  posts: instagramData.value?.posts ?? [],
}))

function formatAxisPounds(value: number | Date) {
  if (typeof value !== 'number') {
    return ''
  }

  return poundFormatter.format(Math.round(value))
}

function formatChartLabel(tick: number | Date, points: Array<{ label: string, index: number }>) {
  if (typeof tick !== 'number') {
    return ''
  }

  const point = points.find(item => item.index === Math.round(tick))
  return point?.label ?? ''
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col gap-2 overflow-hidden px-4 py-3">
    <div class="grid flex-1 min-h-0 gap-1.5 xl:grid-cols-[0.82fr_1.04fr_1.04fr_1.12fr] xl:grid-rows-[minmax(0,0.47fr)_minmax(0,0.53fr)]">
      <section class="min-h-0 xl:col-start-1 xl:row-start-1">
        <Card class="h-full min-h-0 border-slate-200 bg-slate-50/80 shadow-none">
          <CardContent class="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-2 px-3 py-3">
            <div class="grid grid-cols-2 gap-2">
              <div class="flex min-h-[4.5rem] items-center justify-center rounded-xl border border-slate-200/80 bg-white/85 px-3 py-2.5 text-center">
                <p class="truncate font-mono text-[1.28rem] font-semibold tracking-tight text-slate-950">
                  {{ date }}
                </p>
              </div>

              <div class="flex min-h-[4.5rem] items-center justify-center rounded-xl border border-slate-200/80 bg-white/85 px-3 py-2.5 text-center">
                <p class="truncate font-mono text-[1.28rem] font-semibold tracking-tight text-slate-950 tabular-nums">
                  {{ time }}
                </p>
              </div>
            </div>

            <div
              v-if="weatherPending"
              class="grid min-h-0 grid-rows-[minmax(0,1.35fr)_minmax(0,1fr)] gap-2"
            >
              <Skeleton class="h-full rounded-xl" />
              <div class="grid grid-cols-3 gap-2">
                <Skeleton class="h-full rounded-lg" />
                <Skeleton class="h-full rounded-lg" />
                <Skeleton class="h-full rounded-lg" />
              </div>
            </div>

            <div
              v-else-if="weatherError"
              class="flex min-h-0 items-center rounded-xl border border-dashed border-rose-200 bg-rose-50 px-4 py-6 text-sm text-rose-700"
            >
              Unable to load weather.
            </div>

            <div
              v-else
              class="grid min-h-0 grid-rows-[minmax(0,1.35fr)_minmax(0,1fr)] gap-2"
            >
              <div class="flex h-full min-h-0 rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2.5">
                <div class="flex h-full w-full flex-col items-center justify-center text-center">
                  <component
                    :is="weatherCard.icon"
                    class="mx-auto size-10 text-brand"
                  />
                  <p class="mt-2 text-center font-mono text-[2rem] font-semibold tracking-tight text-slate-950 tabular-nums">
                    {{ weatherCard.temperature }}
                  </p>
                  <p class="mt-0.5 text-center text-[13px] font-medium text-slate-700">
                    {{ weatherCard.condition }}
                  </p>
                  <p class="mt-0.5 text-center text-[12px] text-slate-500">
                    Feels like {{ weatherCard.apparentTemperature }}
                  </p>
                  <p class="mt-1.5 text-center text-[10px] uppercase tracking-[0.16em] text-slate-500">
                    {{ weatherCard.highLow }}
                  </p>
                </div>
              </div>

              <div class="grid h-full min-h-0 grid-cols-3 gap-2">
                <div
                  v-for="period in weatherCard.periods"
                  :key="period.label"
                  class="flex h-full flex-col items-center justify-center rounded-lg border border-slate-200/80 bg-white/80 px-2 py-2 text-center"
                >
                  <p class="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    {{ period.label }}
                  </p>
                  <component
                    :is="period.icon"
                    class="mt-2 size-4 text-brand"
                  />
                  <p class="mt-2 font-mono text-[1rem] font-semibold text-slate-950 tabular-nums">
                    {{ period.displayTemp }}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section class="min-h-0 xl:col-span-2 xl:col-start-2 xl:row-start-1">
        <div
          v-if="summaryPending"
          class="grid h-full min-h-0 gap-2 lg:grid-cols-[1.12fr_0.88fr]"
        >
          <Skeleton class="h-full rounded-xl" />
          <div class="grid h-full min-h-0 grid-rows-2 gap-2">
            <Skeleton class="rounded-xl" />
            <Skeleton class="rounded-xl" />
          </div>
        </div>

        <div
          v-else-if="summaryError"
          class="flex h-full items-center rounded-2xl border border-dashed border-rose-200 bg-rose-50 px-5 py-6 text-sm text-rose-700"
        >
          Unable to load weight totals.
        </div>

        <div
          v-else
          class="grid h-full min-h-0 gap-2 lg:grid-cols-[1.14fr_0.86fr]"
        >
          <div class="flex h-full min-h-0 flex-col rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5">
            <div>
              <p class="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand">
                {{ topCards.week.label }}
              </p>
              <p class="mt-1 font-mono text-[1.5rem] font-semibold tracking-tight text-slate-950 tabular-nums">
                {{ topCards.week.value }}
              </p>
            </div>

            <div class="mt-2 grid gap-1.5 md:grid-cols-2">
              <div class="rounded-lg border border-slate-200/80 bg-white/80 px-2.5 py-1.5">
                <p class="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Today
                </p>
                <p class="mt-1 font-mono text-[0.95rem] font-semibold tracking-tight text-slate-950 tabular-nums">
                  {{ topCards.week.today }}
                </p>
              </div>

              <div class="rounded-lg border border-slate-200/80 bg-white/80 px-2.5 py-1.5">
                <p class="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Remaining this week
                </p>
                <p class="mt-1 font-mono text-[0.95rem] font-semibold tracking-tight text-slate-950 tabular-nums">
                  {{ topCards.week.remaining }}
                </p>
              </div>
            </div>

            <div
              ref="weekChartElement"
              class="mt-2 flex-1 min-h-0 overflow-hidden rounded-lg border border-slate-200/80 bg-white/80 px-1.5 pb-1.5 pt-1"
            >
              <ChartContainer
                :config="chartConfig"
                class="h-full w-full"
              >
                <VisXYContainer
                  :height="weekChartHeight"
                  :padding="{ top: 2, right: 2, bottom: 18, left: 32 }"
                >
                  <VisGroupedBar
                    :data="topCards.week.chart"
                    :x="(datum) => datum.index"
                    :y="(datum) => datum.pounds"
                    :color="() => 'var(--color-brand)'"
                  />
                  <VisAxis
                    type="x"
                    :grid-line="false"
                    :tick-line="false"
                    :domain-line="false"
                    :tick-values="topCards.week.chart.map(point => point.index)"
                    :tick-format="(tick) => formatChartLabel(tick, topCards.week.chart)"
                    :tick-padding="1"
                    tick-text-color="rgb(100 116 139)"
                    tick-text-font-size="8px"
                  />
                  <VisAxis
                    type="y"
                    :grid-line="false"
                    :tick-line="false"
                    :domain-line="false"
                    :tick-format="formatAxisPounds"
                    :num-ticks="5"
                    tick-text-color="rgb(100 116 139)"
                    tick-text-font-size="8px"
                  />
                </VisXYContainer>
              </ChartContainer>
            </div>
          </div>

          <div class="grid h-full min-h-0 grid-rows-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-2">
            <div class="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5">
              <p class="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand">
                {{ topCards.month.label }}
              </p>

              <div class="mt-1.5 grid flex-1 min-h-0 grid-rows-[minmax(0,1fr)_auto] gap-1.5">
                <div class="flex min-h-0 flex-col justify-center rounded-xl border border-slate-200/80 bg-white/85 px-3 py-2.5">
                  <p class="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Pounds booked
                  </p>
                  <p class="mt-1.5 font-mono text-[1.9rem] font-semibold tracking-tight text-slate-950 tabular-nums">
                    {{ topCards.month.value }}
                  </p>
                </div>

                <div class="grid grid-cols-2 gap-1.5">
                  <div class="min-w-0 rounded-lg border border-slate-200/80 bg-white/80 px-2.5 py-2">
                    <p class="text-[8px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Moves
                    </p>
                    <p class="mt-1 truncate font-mono text-[0.95rem] font-semibold tracking-tight text-slate-950 tabular-nums">
                      {{ topCards.month.movesThisMonth }}
                    </p>
                  </div>

                  <div class="min-w-0 rounded-lg border border-slate-200/80 bg-white/80 px-2.5 py-2">
                    <p class="text-[8px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Avg. value
                    </p>
                    <p class="mt-1 truncate font-mono text-[0.95rem] font-semibold tracking-tight text-slate-950 tabular-nums">
                      {{ topCards.month.avgMoveValueThisMonth }}
                    </p>
                  </div>
                </div>
              </div>

              <!--
              <div
                ref="monthChartElement"
                class="mt-2 flex-1 min-h-0 overflow-hidden rounded-lg border border-slate-200/80 bg-white/80 px-1.5 pb-1.5 pt-1"
              >
                <ChartContainer
                  :config="chartConfig"
                  class="h-full w-full"
                >
                  <VisXYContainer
                    :height="monthChartHeight"
                    :padding="{ top: 2, right: 2, bottom: 18, left: 18 }"
                  >
                    <VisLine
                      :data="topCards.month.chart"
                      :x="(datum) => datum.index"
                      :y="(datum) => datum.pounds"
                      :color="() => 'var(--color-brand)'"
                      curve-type="linear"
                      :line-width="3"
                    />
                    <VisAxis
                      type="x"
                      :grid-line="false"
                      :tick-line="false"
                      :domain-line="false"
                      :tick-values="topCards.month.chart.map(point => point.index)"
                      :tick-format="(tick) => formatChartLabel(tick, topCards.month.chart)"
                      :tick-padding="1"
                      tick-text-color="rgb(100 116 139)"
                      tick-text-font-size="8px"
                    />
                    <VisAxis
                      type="y"
                      :grid-line="false"
                      :tick-line="false"
                      :domain-line="false"
                      :tick-format="formatAxisPounds"
                      tick-text-color="rgb(100 116 139)"
                      tick-text-font-size="8px"
                    />
                  </VisXYContainer>
                </ChartContainer>
              </div>
              -->
            </div>

            <div class="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5">
              <p class="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand">
                {{ topCards.year.label }}
              </p>

              <div class="mt-1.5 flex flex-1 min-h-0 flex-col justify-center rounded-xl border border-slate-200/80 bg-white/85 px-3 py-4 text-center">
                <p class="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Pounds so far
                </p>
                <p class="mt-3 font-mono text-[2.28rem] font-semibold leading-none tracking-[-0.035em] text-slate-950 tabular-nums">
                  {{ topCards.year.value }}
                </p>
                <p class="mt-2 text-[10px] uppercase tracking-[0.16em] text-slate-500">
                  Running total across 2026
                </p>
              </div>

              <!--
              <div
                ref="yearChartElement"
                class="mt-2 flex-1 min-h-0 overflow-hidden rounded-lg border border-slate-200/80 bg-white/80 px-1.5 pb-1.5 pt-1"
              >
                <ChartContainer
                  :config="chartConfig"
                  class="h-full w-full"
                >
                  <VisXYContainer
                    :height="yearChartHeight"
                    :padding="{ top: 2, right: 2, bottom: 18, left: 18 }"
                  >
                    <VisLine
                      :data="topCards.year.chart"
                      :x="(datum) => datum.index"
                      :y="(datum) => datum.pounds"
                      :color="() => 'var(--color-brand)'"
                      curve-type="linear"
                      :line-width="3"
                    />
                    <VisAxis
                      type="x"
                      :grid-line="false"
                      :tick-line="false"
                      :domain-line="false"
                      :tick-values="topCards.year.chart.map(point => point.index)"
                      :tick-format="(tick) => formatChartLabel(tick, topCards.year.chart)"
                      :tick-padding="1"
                      tick-text-color="rgb(100 116 139)"
                      tick-text-font-size="8px"
                    />
                    <VisAxis
                      type="y"
                      :grid-line="false"
                      :tick-line="false"
                      :domain-line="false"
                      :tick-format="formatAxisPounds"
                      tick-text-color="rgb(100 116 139)"
                      tick-text-font-size="8px"
                    />
                  </VisXYContainer>
                </ChartContainer>
              </div>
              -->
            </div>
          </div>
        </div>
      </section>

      <section class="min-h-0 xl:col-start-4 xl:row-start-1">
        <Card class="flex h-full min-h-0 flex-col gap-0 overflow-hidden border-slate-200 bg-slate-50/80 py-0 shadow-none">
          <CardContent class="flex h-full min-h-0 flex-1 flex-col p-0">
            <div
              v-if="mapPending"
              class="flex-1"
            >
              <Skeleton class="h-full rounded-none" />
            </div>

            <div
              v-else-if="mapError"
              class="flex flex-1 items-center bg-rose-50 px-4 py-6 text-sm text-rose-700"
            >
              Unable to load destination data.
            </div>

            <div
              v-else
              class="flex-1 min-h-0"
            >
              <RegionalMoveMap :points="mapCard.points" />
            </div>
          </CardContent>
        </Card>
      </section>

      <section class="min-h-0 xl:col-start-1 xl:row-start-2">
        <Card class="h-full min-h-0 border-slate-200 bg-slate-50/80 shadow-none">
          <CardContent class="flex h-full min-h-0 flex-col px-3 pb-3 pt-2">
            <div class="flex items-baseline justify-between gap-3">
              <p class="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand">
                Daily calendar
              </p>
              <p class="text-[9px] uppercase tracking-[0.16em] text-slate-500">
                {{ calendarsCard.todayLabel }}
              </p>
            </div>

            <div
              v-if="calendarsPending"
              class="mt-2 space-y-2"
            >
              <Skeleton class="h-20 rounded-xl" />
              <Skeleton class="h-20 rounded-xl" />
              <Skeleton class="h-20 rounded-xl" />
            </div>

            <div
              v-else-if="calendarsError"
              class="mt-2 flex flex-1 items-center rounded-xl border border-dashed border-rose-200 bg-rose-50 px-4 py-6 text-sm text-rose-700"
            >
              Unable to load calendar jobs.
            </div>

            <div
              v-else-if="!calendarsCard.todayJobs.length"
              class="mt-2 flex flex-1 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white/70 px-4 py-8 text-center text-sm text-slate-500"
            >
              No jobs on today's calendar.
            </div>

            <div
              v-else
              class="mt-2 flex min-h-0 flex-1 flex-col"
            >
              <div class="grid gap-2">
                <div
                  v-for="job in visibleTodayJobs"
                  :key="job.jobKey"
                  class="rounded-xl border border-slate-200/80 bg-white/85 px-3 py-2"
                >
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                      <p class="truncate text-[13px] font-semibold text-slate-950">
                        {{ job.contactName }}
                      </p>
                      <p
                        v-if="job.dayLabel"
                        class="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-brand"
                      >
                        {{ job.dayLabel }}
                      </p>
                    </div>
                    <p class="font-mono text-[12px] font-semibold text-emerald-700 tabular-nums">
                      {{ job.costLabel }}
                    </p>
                  </div>

                  <div class="mt-1.5 flex flex-wrap gap-1 text-[10px]">
                    <div class="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono font-semibold text-slate-950">
                      {{ job.weightLabel }}
                    </div>
                    <div class="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-medium text-slate-800">
                      {{ job.crewLabel }}
                    </div>
                    <div class="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-medium text-slate-800">
                      {{ job.truckLabel }}
                    </div>
                    <div
                      v-if="job.packingLabel"
                      class="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-medium text-slate-800"
                    >
                      {{ job.packingLabel }}
                    </div>
                  </div>

                  <p class="mt-1.5 truncate text-[10px] uppercase tracking-[0.14em] text-slate-500">
                    <span class="font-semibold text-slate-700">{{ job.originTown }}</span>
                    <span class="px-1 italic text-slate-400">to</span>
                    <span class="font-semibold text-slate-700">{{ job.destinationTown }}</span>
                  </p>
                </div>
              </div>

              <div
                v-if="hiddenTodayJobs"
                class="mt-2 rounded-lg border border-dashed border-slate-300 bg-white/75 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500"
              >
                {{ hiddenTodayJobs }} more jobs on today's calendar
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section class="min-h-0 xl:col-span-2 xl:col-start-2 xl:row-start-2">
        <Card class="h-full min-h-0 border-slate-200 bg-slate-50/80 shadow-none">
          <CardContent class="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] px-3 pb-0 pt-2">
            <p class="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand">
              Weekly calendar
            </p>

            <div
              v-if="calendarsPending"
              class="mt-2 grid flex-1 gap-2 lg:grid-cols-7"
            >
              <Skeleton
                v-for="index in 7"
                :key="index"
                class="h-full rounded-xl"
              />
            </div>

            <div
              v-else-if="calendarsError"
              class="mt-2 flex flex-1 items-center rounded-xl border border-dashed border-rose-200 bg-rose-50 px-4 py-6 text-sm text-rose-700"
            >
              Unable to load weekly calendar.
            </div>

            <div
              v-else
              class="mt-2 grid flex-1 min-h-0 gap-2 lg:grid-cols-7 lg:grid-rows-1"
            >
              <div
                v-for="day in weeklyCalendarDays"
                :key="day.isoDate"
                :class="[
                  'flex h-full min-h-0 flex-col rounded-xl bg-white/85 px-2 py-2',
                  day.isoDate === calendarsCard.todayIso
                    ? 'border-2 border-brand shadow-[inset_0_0_0_1px_rgba(0,109,182,0.14)]'
                    : 'border border-slate-200/80',
                ]"
              >
                <p class="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {{ day.label }}
                </p>

                <div
                  v-if="!day.jobs.length"
                  class="mt-2 text-[10px] text-slate-400"
                >
                  No jobs
                </div>

                <div
                  v-else
                  class="mt-2 space-y-1 overflow-hidden"
                >
                  <div
                    v-for="job in day.visibleJobs"
                    :key="job.jobKey"
                    class="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5"
                  >
                    <div class="flex items-start justify-between gap-1.5">
                      <p class="line-clamp-2 text-[10px] font-semibold leading-tight text-slate-950">
                        {{ job.contactName }}
                      </p>
                      <p class="shrink-0 font-mono text-[9px] font-semibold text-emerald-700 tabular-nums">
                        {{ job.costLabel }}
                      </p>
                    </div>
                    <p
                      v-if="job.dayLabel"
                      class="mt-1 text-[8px] font-semibold uppercase tracking-[0.14em] text-brand"
                    >
                      {{ job.dayLabel }}
                    </p>
                    <p class="mt-1 text-[9px] font-medium text-slate-700">
                      {{ job.weightLabel }} · {{ job.crewLabel }} · {{ job.truckLabel }}<span v-if="job.packingLabel"> · {{ job.packingLabel }}</span>
                    </p>
                    <p class="mt-1 line-clamp-2 text-[8px] uppercase tracking-[0.14em] text-slate-500">
                      <span class="font-semibold text-slate-700">{{ job.originTown }}</span>
                      <span class="px-1 italic text-slate-400">to</span>
                      <span class="font-semibold text-slate-700">{{ job.destinationTown }}</span>
                    </p>
                  </div>

                  <p
                    v-if="day.hiddenJobs"
                    class="rounded-md border border-dashed border-slate-300 bg-white/85 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.14em] text-slate-500"
                  >
                    +{{ day.hiddenJobs }} more
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section class="min-h-0 xl:col-start-4 xl:row-start-2">
        <Card class="h-full min-h-0 border-slate-200 bg-slate-50/80 shadow-none">
          <CardContent class="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] px-3 pb-0 pt-2">
          <div class="flex items-baseline justify-between gap-3">
            <p class="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand">
              Instagram
            </p>
          </div>

          <div
            v-if="instagramPending"
            class="mt-2 h-full min-h-0"
          >
            <Skeleton class="h-full rounded-xl" />
          </div>

          <div
            v-else-if="instagramError"
            class="mt-2 flex min-h-0 items-center rounded-xl border border-dashed border-rose-200 bg-rose-50 px-4 py-6 text-sm text-rose-700"
          >
            Unable to load Instagram posts.
          </div>

          <div
            v-else-if="!instagramCard.posts.length"
            class="mt-2 flex min-h-0 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white/70 px-4 py-8 text-center text-sm text-slate-500"
          >
            No Instagram posts available right now.
          </div>

          <div
            v-else
            class="mt-2 h-full min-h-0"
          >
            <InstagramFeed :posts="instagramCard.posts" />
          </div>
          </CardContent>
        </Card>
      </section>
    </div>
  </div>
</template>
