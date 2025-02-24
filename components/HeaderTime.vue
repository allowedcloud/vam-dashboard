<script setup>
import { onMounted, onUnmounted, ref } from 'vue'

const currentTime = ref(new Date())
let timer = null

function formatTime(date) {
  let hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  const seconds = date.getSeconds().toString().padStart(2, '0')
  const ampm = hours >= 12 ? 'PM' : 'AM'

  // Convert to 12-hour format
  hours = hours % 12
  hours = hours || 12 // Handle midnight (0 hours)

  return `${hours}:${minutes}:${seconds} ${ampm}`
}

function updateDateTime() {
  currentTime.value = new Date()
}

onMounted(() => {
  // Update every second
  timer = setInterval(updateDateTime, 1000)
})

onUnmounted(() => {
  if (timer) {
    clearInterval(timer)
  }
})
</script>

<template>
  <div>
    <div class="text-6xl font-bold text-gray-800 flex items-center">
      <h1 class="w-[150px] mr-14 whitespace-nowrap">
        {{ formatTime(currentTime).slice(0, -3) }}
      </h1>
      <h1 class="pl-4">
        {{ formatTime(currentTime).slice(-2) }}
      </h1>
    </div>
  </div>
</template>
