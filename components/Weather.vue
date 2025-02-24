<script setup>
import { Cloud, CloudRain, CloudSun, Sun } from 'lucide-vue-next'
import { fetchWeatherApi } from 'openmeteo'
import { onMounted, ref } from 'vue'

const weatherData = ref(null)
const loading = ref(true)
const error = ref(null)

function range(start, stop, step) {
  return Array.from({ length: (stop - start) / step }, (_, i) => start + i * step)
}

function getWeatherColor(temperature) {
  if (temperature >= 85)
    return '#ff4444'
  if (temperature >= 70)
    return '#ff8c00'
  if (temperature >= 60)
    return '#2ecc71'
  if (temperature >= 40)
    return '#3498db'
  return '#34495e'
}

async function fetchWeather() {
  try {
    loading.value = true
    error.value = null

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

    weatherData.value = {
      current: {
        time: new Date(Number(current.time()) * 1000),
        temperature2m: current.variables(0).value(),
        relativeHumidity2m: current.variables(1).value(),
        apparentTemperature: current.variables(2).value(),
        precipitation: current.variables(3).value(),
        rain: current.variables(4).value(),
      },
      hourly: {
        time: range(Number(hourly.time()), Number(hourly.timeEnd()), hourly.interval()).map(
          t => new Date(t * 1000),
        ),
        temperature2m: hourly.variables(0).valuesArray(),
        relativeHumidity2m: hourly.variables(1).valuesArray(),
        precipitationProbability: hourly.variables(2).valuesArray(),
        rain: hourly.variables(3).valuesArray(),
      },
    }
  }
  catch (e) {
    error.value = 'Failed to fetch weather data'
    console.error(e)
  }
  finally {
    loading.value = false
  }
}

function formatTime(date) {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/New_York',
  })
}

onMounted(() => {
  fetchWeather()
})
</script>

<template>
  <div class="">
    <div v-if="loading" class="loading">
      Loading weather data...
    </div>

    <div v-else-if="error" class="error">
      {{ error }}
    </div>

    <div v-else-if="weatherData" class="weather-data flex gap-6 h-auto w-full p-2 m-8 rounded-lg bg-slate-200">
      <div class="current-weather w-1/4">
        <div
          v-if="weatherData.current.rain > 0 || weatherData.current.precipitation > 0"
          class="rain-container"
        >
          <div
            v-for="n in 20" :key="n"
            class="rain-drop"
            :style="{ '--delay': `${Math.random() * 2}s` }"
          />
        </div>

        <h2 class="text-xl font-bold">
          Current Weather
        </h2>
        <div class="current-icon">
          <CloudRain
            v-if="weatherData.current.rain > 0"
            :size="48"
            :stroke-width="1.5"
            :color="getWeatherColor(weatherData.current.temperature2m)"
            class="weather-icon animate-float"
          />
          <Cloud
            v-else-if="weatherData.current.precipitation > 0"
            :size="48"
            :stroke-width="1.5"
            :color="getWeatherColor(weatherData.current.temperature2m)"
            class="weather-icon animate-float"
          />
          <CloudSun
            v-else-if="weatherData.current.relativeHumidity2m > 70"
            :size="48"
            :stroke-width="1.5"
            :color="getWeatherColor(weatherData.current.temperature2m)"
            class="weather-icon animate-float"
          />
          <Sun
            v-else
            :size="48"
            :stroke-width="1.5"
            :color="getWeatherColor(weatherData.current.temperature2m)"
            class="weather-icon animate-float"
          />
        </div>

        <p>Time: {{ formatTime(weatherData.current.time) }}</p>
        <p>Temperature: {{ Math.round(weatherData.current.temperature2m) }}°F</p>
        <p>Feels like: {{ Math.round(weatherData.current.apparentTemperature) }}°F</p>
        <p>Humidity: {{ Math.round(weatherData.current.relativeHumidity2m) }}%</p>
        <p>Rain: {{ weatherData.current.rain.toFixed(2) }} inches</p>
      </div>

      <div class="hourly-forecast w-3/4 flex items-center">
        <!-- <h2>Hourly Forecast</h2> -->
        <div class="forecast-list flex">
          <div
            v-for="(time, index) in weatherData.hourly.time
              .filter((_, i) => {
                const forecastTime = weatherData.hourly.time[i]
                return forecastTime >= weatherData.current.time
              })
              .slice(0, 6)"
            :key="index"
            class="forecast-item"
          >
            <div
              v-if="weatherData.hourly.rain[index] > 0
                || weatherData.hourly.precipitationProbability[index] > 70"
              class="rain-container small"
            >
              <div
                v-for="n in 10" :key="n"
                class="rain-drop"
                :style="{ '--delay': `${Math.random() * 2}s` }"
              />
            </div>

            <div class="forecast-icon">
              <CloudRain
                v-if="weatherData.hourly.rain[index] > 0"
                :size="24"
                :stroke-width="1.5"
                :color="getWeatherColor(weatherData.hourly.temperature2m[index])"
                class="weather-icon animate-pulse"
              />
              <Cloud
                v-else-if="weatherData.hourly.precipitationProbability[index] > 70"
                :size="24"
                :stroke-width="1.5"
                :color="getWeatherColor(weatherData.hourly.temperature2m[index])"
                class="weather-icon animate-pulse"
              />
              <CloudSun
                v-else-if="weatherData.hourly.precipitationProbability[index] > 30"
                :size="24"
                :stroke-width="1.5"
                :color="getWeatherColor(weatherData.hourly.temperature2m[index])"
                class="weather-icon animate-pulse"
              />
              <Sun
                v-else
                :size="24"
                :stroke-width="1.5"
                :color="getWeatherColor(weatherData.hourly.temperature2m[index])"
                class="weather-icon animate-pulse"
              />
            </div>

            <p>{{ formatTime(time) }}</p>
            <p>{{ Math.round(weatherData.hourly.temperature2m[index]) }}°F</p>
            <p>{{ Math.round(weatherData.hourly.precipitationProbability[index]) }}% chance of rain</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<!-- <style scoped>
.weather-container {
  max-width: 600px;
  margin: 0 auto;
  padding: 1rem;
}

.loading, .error {
  text-align: center;
  padding: 2rem;
}

.error {
  color: red;
}

.current-weather {
  background-color: #f5f5f5;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  text-align: center;
  position: relative;
  overflow: hidden;
}

.rain-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
}

.rain-container.small {
  opacity: 0.7;
}

.rain-drop {
  position: absolute;
  width: 1px;
  height: 15px;
  background: linear-gradient(transparent, #6ab4ff);
  animation: rain-fall 1s linear infinite;
  animation-delay: var(--delay);
}

@keyframes rain-fall {
  0% {
    transform: translateY(-100%);
    opacity: 0;
  }
  20% {
    opacity: 0.5;
  }
  80% {
    opacity: 0.5;
  }
  100% {
    transform: translateY(100%);
    opacity: 0;
  }
}

.rain-container .rain-drop {
  left: calc(var(--delay) * 50%);
}

.rain-container.small .rain-drop {
  height: 10px;
}

.current-icon {
  margin: 1rem 0;
  position: relative;
  z-index: 2;
}

.weather-icon {
  transition: transform 0.3s ease, color 0.3s ease;
}

.weather-icon:hover {
  transform: scale(1.1);
}

@keyframes float {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-5px);
  }
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

.animate-float {
  animation: float 3s ease-in-out infinite;
}

.animate-pulse {
  animation: pulse 2s ease-in-out infinite;
}

.forecast-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
}

.forecast-item {
  background-color: #f5f5f5;
  padding: 0.5rem;
  border-radius: 8px;
  text-align: center;
  position: relative;
  overflow: hidden;
}

.forecast-icon {
  margin: 0.5rem 0;
  position: relative;
  z-index: 2;
}

h2 {
  margin-bottom: 1rem;
  color: #333;
}

p {
  margin: 0.5rem 0;
}
</style> -->
