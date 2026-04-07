interface MoveMapPoint {
  address: string
  matchedAddress?: string
  latitude: number
  longitude: number
  moveCount: number
}

interface BackendMoveMapResponse {
  year: string
  from: string
  to: string
  totals: {
    completedMoves: number
    virginiaDestinations: number
    geocodedDestinations: number
  }
  points: MoveMapPoint[]
}

interface BackendRangeJob {
  occurrenceKey?: string
  jobKey: string
  serviceDate?: string
  destination?: string
  destinationFull?: string
  destinationCity?: string
}

interface BackendRangeResponse {
  from: string
  to: string
  jobs: BackendRangeJob[]
}

const CITY_COORDINATES: Record<string, { latitude: number, longitude: number }> = {
  toano: { latitude: 37.3726, longitude: -76.7977 },
  williamsburg: { latitude: 37.2707, longitude: -76.7075 },
  yorktown: { latitude: 37.2388, longitude: -76.5097 },
  'newport news': { latitude: 37.0871, longitude: -76.4730 },
  hampton: { latitude: 37.0299, longitude: -76.3452 },
  poquoson: { latitude: 37.1224, longitude: -76.3458 },
  gloucester: { latitude: 37.4138, longitude: -76.5266 },
  'james city': { latitude: 37.3038, longitude: -76.7518 },
  norge: { latitude: 37.3671, longitude: -76.7788 },
  barhamsville: { latitude: 37.4571, longitude: -76.8408 },
  mechanicsville: { latitude: 37.6088, longitude: -77.3733 },
  richmond: { latitude: 37.5407, longitude: -77.4360 },
  norfolk: { latitude: 36.8508, longitude: -76.2859 },
  'virginia beach': { latitude: 36.8529, longitude: -75.9780 },
  suffolk: { latitude: 36.7282, longitude: -76.5836 },
  chesapeake: { latitude: 36.7682, longitude: -76.2875 },
  portsmouth: { latitude: 36.8354, longitude: -76.2983 },
}

function normalizeCityKey(value?: string) {
  return (value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function extractCity(value?: string) {
  if (!value) {
    return ''
  }

  const parts = value.split(',').map(part => part.trim()).filter(Boolean)
  const vaIndex = parts.findIndex(part => /\bVA\b/i.test(part) || /\bVirginia\b/i.test(part))
  if (vaIndex > 0) {
    return parts[vaIndex - 1]
  }

  return parts[parts.length - 2] || parts[0] || ''
}

async function buildCityFallback(
  baseUrl: string,
  token: string,
  currentYear: string,
) {
  const todayIso = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())

  const range = await $fetch<BackendRangeResponse>('/jobs/range', {
    baseURL: baseUrl,
    headers: {
      Authorization: `Bearer ${token}`,
    },
    query: {
      from: `${currentYear}-01-01`,
      to: todayIso,
    },
    retry: 0,
    timeout: 2500,
  })

  const seen = new Set<string>()
  const grouped = new Map<string, { city: string, moveCount: number }>()
  let completedMoves = 0

  for (const job of range.jobs) {
    const occurrenceKey = job.occurrenceKey || job.jobKey
    if (!occurrenceKey || seen.has(occurrenceKey)) {
      continue
    }

    seen.add(occurrenceKey)
    completedMoves += 1

    const city = job.destinationCity || extractCity(job.destinationFull || job.destination)
    const cityKey = normalizeCityKey(city)
    if (!cityKey || !(cityKey in CITY_COORDINATES)) {
      continue
    }

    const existing = grouped.get(cityKey)
    if (existing) {
      existing.moveCount += 1
      continue
    }

    grouped.set(cityKey, {
      city,
      moveCount: 1,
    })
  }

  const points = [...grouped.entries()].map(([cityKey, entry]) => ({
    address: entry.city,
    matchedAddress: `${entry.city}, VA`,
    latitude: CITY_COORDINATES[cityKey].latitude,
    longitude: CITY_COORDINATES[cityKey].longitude,
    moveCount: entry.moveCount,
  }))

  return {
    year: currentYear,
    from: `${currentYear}-01-01`,
    to: todayIso,
    totals: {
      completedMoves,
      virginiaDestinations: grouped.size,
      geocodedDestinations: points.length,
    },
    points,
  }
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

  const currentYear = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
  }).format(new Date())

  const emptyResponse = {
    year: currentYear,
    from: `${currentYear}-01-01`,
    to: currentYear,
    totals: {
      completedMoves: 0,
      virginiaDestinations: 0,
      geocodedDestinations: 0,
    },
    points: [],
  } satisfies BackendMoveMapResponse

  let response: BackendMoveMapResponse

  try {
    response = await $fetch<BackendMoveMapResponse>('/dashboard/move-map', {
      baseURL: baseUrl,
      headers: {
        Authorization: `Bearer ${token}`,
      },
      query: {
        year: currentYear,
      },
      retry: 0,
      timeout: 5000,
    })
  } catch {
    try {
      response = await buildCityFallback(baseUrl, token, currentYear)
    } catch {
      response = emptyResponse
    }
  }

  if (!response.points.length) {
    try {
      response = await buildCityFallback(baseUrl, token, currentYear)
    } catch {
      response = emptyResponse
    }
  }

  return {
    ...response,
    sampleDestinations: response.points
      .slice()
      .sort((a, b) => b.moveCount - a.moveCount || a.address.localeCompare(b.address))
      .slice(0, 8)
      .map(point => ({
        destination: point.matchedAddress || point.address,
        moveCount: point.moveCount,
      })),
  }
})
