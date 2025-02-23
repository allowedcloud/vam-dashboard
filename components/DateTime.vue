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

function formatDate(date) {
  const options = { month: 'long', day: 'numeric' }
  return date.toLocaleDateString('en-US', options)
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
  <div class="font-sans text-center flex justify-around w-full">
    <div class="text-5xl text-gray-600">
      Today is
      <strong class="text-gray-800">
        {{ formatDate(currentTime) }}
      </strong>
    </div>
    <div class="font-mono text-5xl font-bold text-gray-800">
      <span class="inline-block">{{ formatTime(currentTime).slice(0, -3) }}</span>
      <span class="inline-block pl-4">{{ formatTime(currentTime).slice(-2) }}</span>
    </div>
  </div>
</template>
