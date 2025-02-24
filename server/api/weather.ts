import { fetchWeatherApi } from 'openmeteo'

export default defineEventHandler(async (event) => {
  try {
    const params = {
      latitude: 37.2707,
      longitude: -76.7075,
      current: ['temperature_2m', 'relative_humidity_2m', 'apparent_temperature', 'precipitation', 'rain'],
      hourly: ['temperature_2m', 'relative_humidity_2m', 'precipitation_probability', 'rain'],
      temperature_unit: 'fahrenheit',
      wind_speed_unit: 'mph',
      precipitation_unit: 'inch',
      timezone: 'America/New_York',
      forecast_days: 1,
    }

    const url = 'https://api.open-meteo.com/v1/forecast'
    const responses = await fetchWeatherApi(url, params)
    const response = responses[0]

    const current = response.current()
    const hourly = response.hourly()

    if (!current || !hourly) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Missing weather data in response',
      })
    }

    // Get the current weather variables
    const temperature = current.variables(0)?.value()
    const humidity = current.variables(1)?.value()
    const apparentTemp = current.variables(2)?.value()
    const precipitation = current.variables(3)?.value()
    const rain = current.variables(4)?.value()

    if (
      temperature === null ||
      humidity === null ||
      apparentTemp === null ||
      precipitation === null ||
      rain === null
    ) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Missing current weather data',
      })
    }

    // Get the hourly forecast variables
    const hourlyTemp = hourly.variables(0)?.valuesArray()
    const hourlyHumidity = hourly.variables(1)?.valuesArray()
    const hourlyPrecipProb = hourly.variables(2)?.valuesArray()
    const hourlyRain = hourly.variables(3)?.valuesArray()

    if (
      !hourlyTemp ||
      !hourlyHumidity ||
      !hourlyPrecipProb ||
      !hourlyRain
    ) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Missing hourly forecast data',
      })
    }

    // Helper function for time range
    const range = (start: number, stop: number, step: number) => {
      return Array.from({ length: (stop - start) / step }, (_, i) => start + i * step)
    }

    return {
      current: {
        time: new Date(Number(current.time()) * 1000),
        temperature2m: temperature,
        relativeHumidity2m: humidity,
        apparentTemperature: apparentTemp,
        precipitation: precipitation,
        rain: rain,
      },
      hourly: {
        time: range(Number(hourly.time()), Number(hourly.timeEnd()), hourly.interval()).map(
          t => new Date(t * 1000),
        ),
        temperature2m: hourlyTemp,
        relativeHumidity2m: hourlyHumidity,
        precipitationProbability: hourlyPrecipProb,
        rain: hourlyRain,
      },
    }
  }
  catch (e) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch weather data',
    })
  }
})