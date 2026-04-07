interface OpenMeteoResponse {
  current?: {
    temperature_2m?: number
    apparent_temperature?: number
    weather_code?: number
    is_day?: number
  }
  hourly?: {
    time?: string[]
    temperature_2m?: number[]
    weather_code?: number[]
    is_day?: number[]
  }
  daily?: {
    temperature_2m_max?: number[]
    temperature_2m_min?: number[]
  }
}

type WeatherIconKey =
  | 'clear-day'
  | 'clear-night'
  | 'partly-cloudy-day'
  | 'partly-cloudy-night'
  | 'cloudy'
  | 'fog'
  | 'drizzle'
  | 'rain'
  | 'snow'
  | 'storm'

function toCondition(code?: number) {
  switch (code) {
    case 0:
      return { label: 'Clear', dayIcon: 'clear-day', nightIcon: 'clear-night' } as const
    case 1:
    case 2:
      return { label: 'Partly cloudy', dayIcon: 'partly-cloudy-day', nightIcon: 'partly-cloudy-night' } as const
    case 3:
      return { label: 'Cloudy', dayIcon: 'cloudy', nightIcon: 'cloudy' } as const
    case 45:
    case 48:
      return { label: 'Fog', dayIcon: 'fog', nightIcon: 'fog' } as const
    case 51:
    case 53:
    case 55:
    case 56:
    case 57:
      return { label: 'Drizzle', dayIcon: 'drizzle', nightIcon: 'drizzle' } as const
    case 61:
    case 63:
    case 65:
    case 66:
    case 67:
    case 80:
    case 81:
    case 82:
      return { label: 'Rain', dayIcon: 'rain', nightIcon: 'rain' } as const
    case 71:
    case 73:
    case 75:
    case 77:
    case 85:
    case 86:
      return { label: 'Snow', dayIcon: 'snow', nightIcon: 'snow' } as const
    case 95:
    case 96:
    case 99:
      return { label: 'Storms', dayIcon: 'storm', nightIcon: 'storm' } as const
    default:
      return { label: 'Cloudy', dayIcon: 'cloudy', nightIcon: 'cloudy' } as const
  }
}

function findHourlyIndex(times: string[] | undefined, targetHour: string) {
  if (!times) {
    return -1
  }

  return times.findIndex(time => time.endsWith(`T${targetHour}:00`))
}

function buildPeriod(
  label: string,
  targetHour: string,
  hourly: OpenMeteoResponse['hourly'],
) {
  const index = findHourlyIndex(hourly?.time, targetHour)
  const temperature = index >= 0 ? Math.round(hourly?.temperature_2m?.[index] ?? 0) : null
  const weatherCode = index >= 0 ? hourly?.weather_code?.[index] : undefined
  const isDay = index >= 0 ? hourly?.is_day?.[index] === 1 : targetHour !== '21'
  const condition = toCondition(weatherCode)

  return {
    label,
    temperature,
    iconKey: (isDay ? condition.dayIcon : condition.nightIcon) as WeatherIconKey,
  }
}

export default defineEventHandler(async (event) => {
  const latitude = 37.2707
  const longitude = -76.7075
  const timezone = 'America/New_York'

  const weather = await $fetch<OpenMeteoResponse>('https://api.open-meteo.com/v1/forecast', {
    query: {
      latitude,
      longitude,
      current: 'temperature_2m,apparent_temperature,weather_code,is_day',
      hourly: 'temperature_2m,weather_code,is_day',
      daily: 'temperature_2m_max,temperature_2m_min',
      temperature_unit: 'fahrenheit',
      forecast_days: 1,
      timezone,
    },
  })

  const currentCondition = toCondition(weather.current?.weather_code)
  const isDay = weather.current?.is_day === 1

  setHeader(event, 'cache-control', 'public, max-age=600, stale-while-revalidate=1800')

  return {
    location: 'Williamsburg, VA',
    current: {
      temperature: Math.round(weather.current?.temperature_2m ?? 0),
      apparentTemperature: Math.round(weather.current?.apparent_temperature ?? 0),
      condition: currentCondition.label,
      iconKey: (isDay ? currentCondition.dayIcon : currentCondition.nightIcon) as WeatherIconKey,
    },
    today: {
      high: Math.round(weather.daily?.temperature_2m_max?.[0] ?? 0),
      low: Math.round(weather.daily?.temperature_2m_min?.[0] ?? 0),
    },
    periods: [
      buildPeriod('Morning', '09', weather.hourly),
      buildPeriod('Afternoon', '15', weather.hourly),
      buildPeriod('Night', '21', weather.hourly),
    ],
    updatedAt: new Date().toISOString(),
  }
})
