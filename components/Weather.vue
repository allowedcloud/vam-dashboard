<script setup>
import { Cloud, CloudRain, CloudSun, Sun } from 'lucide-vue-next'
import { onMounted, onUnmounted, ref } from 'vue'

const weatherData = ref(null)
const loading = ref(true)
const error = ref(null)
let weatherInterval = null

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

    const { data } = await useFetch('/api/weather')
    weatherData.value = data.value
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
  return new Date(date).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/New_York',
  })
}

onMounted(() => {
  fetchWeather()
  weatherInterval = setInterval(() => {
    fetchWeather()
  }, 15 * 60 * 1000)
})

onUnmounted(() => {
  if (weatherInterval)
    clearInterval(weatherInterval)
})
</script>

<template>
  <BoxContainer>
    <template #title>
      Weather
    </template>
    <div class="w-full mx-auto p-4">
      <div v-if="loading" class="text-center py-8">
        Loading weather data...
      </div>

      <div v-else-if="error" class="text-center py-8 text-red-600">
        {{ error }}
      </div>

      <div v-else-if="weatherData" class="overflow-hidden">
        <div class="flex flex-col md:flex-row">
          <div class="flex flex-col items-center mt-8 w-full md:w-[35%] p-6 border-b md:border-b-0 md:border-r border-slate-200">
            <!-- <h2 class="text-2xl font-bold text-slate-800 mb-4">
              Current Weather
            </h2> -->

            <div class="mr-14 mb-2">
              <div v-if="weatherData.current.rain > 0">
                <CloudRain
                  :size="48"
                  :stroke-width="1.5"
                  :color="getWeatherColor(weatherData.current.temperature2m)"
                  class="mb-2 bounce-animate"
                />
              </div>
              <div v-else-if="weatherData.current.precipitation > 0">
                <Cloud
                  :size="48"
                  :stroke-width="1.5"
                  :color="getWeatherColor(weatherData.current.temperature2m)"
                  class="mb-2 bounce-animate"
                />
              </div>
              <div v-else-if="weatherData.current.relativeHumidity2m > 70">
                <CloudSun
                  :size="48"
                  :stroke-width="1.5"
                  :color="getWeatherColor(weatherData.current.temperature2m)"
                  class="mb-2 bounce-animate"
                />
              </div>
              <div v-else>
                <Sun
                  :size="48"
                  :stroke-width="1.5"
                  :color="getWeatherColor(weatherData.current.temperature2m)"
                  class="mb-2 bounce-animate"
                />
              </div>
            </div>

            <div class="space-y-2 text-slate-700">
              <!-- <p>{{ formatTime(weatherData.current.time) }}</p> -->
              <p class="text-3xl font-bold text-slate-900">
                {{ Math.round(weatherData.current.temperature2m) }}°F
              </p>
              <p>Feels like: {{ Math.round(weatherData.current.apparentTemperature) }}°F</p>
              <p>Humidity: {{ Math.round(weatherData.current.relativeHumidity2m) }}%</p>
              <p>Rain: {{ weatherData.current.rain.toFixed(2) }} inches</p>
            </div>
          </div>

          <div class="w-full md:w-[65%] p-6">
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              <div
                v-for="(time, index) in weatherData.hourly.time
                  .filter((_, i) => {
                    const forecastTime = weatherData.hourly.time[i]
                    return new Date(forecastTime) >= new Date(weatherData.current.time)
                  })"
                :key="index"
                class="bg-slate-100 rounded-lg p-4 shadow-md text-center"
              >
                <div class="mb-2">
                  <CloudRain
                    v-if="weatherData.hourly.rain[index] > 0"
                    :size="24"
                    :stroke-width="1.5"
                    :color="getWeatherColor(weatherData.hourly.temperature2m[index])"
                  />
                  <Cloud
                    v-else-if="weatherData.hourly.precipitationProbability[index] > 70"
                    :size="24"
                    :stroke-width="1.5"
                    :color="getWeatherColor(weatherData.hourly.temperature2m[index])"
                  />
                  <CloudSun
                    v-else-if="weatherData.hourly.precipitationProbability[index] > 30"
                    :size="24"
                    :stroke-width="1.5"
                    :color="getWeatherColor(weatherData.hourly.temperature2m[index])"
                  />
                  <Sun
                    v-else
                    :size="24"
                    :stroke-width="1.5"
                    :color="getWeatherColor(weatherData.hourly.temperature2m[index])"
                  />
                </div>

                <p class="text-sm text-slate-600">
                  {{ formatTime(time) }}
                </p>
                <p class="text-lg font-semibold text-slate-800">
                  {{ Math.round(weatherData.hourly.temperature2m[index]) }}°F
                </p>
                <p class="text-sm text-slate-600">
                  {{ Math.round(weatherData.hourly.precipitationProbability[index]) }}% rain
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </BoxContainer>
</template>

<style scoped>
@keyframes bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

.bounce-animate {
  animation: bounce 2s ease-in-out infinite;
}

.bounce-on-hover {
  transition: transform 0.2s;
}

.bounce-on-hover:hover {
  animation: bounce 1s ease-in-out infinite;
}
</style>
