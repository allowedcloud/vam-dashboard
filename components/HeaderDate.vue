<script setup>
const currentTime = ref(new Date())

function formatDate(date) {
  const options = { month: 'long', day: 'numeric' }
  return date.toLocaleDateString('en-US', options)
}
</script>

<template>
  <h1 class="text-6xl font-bold">
    {{ formatDate(currentTime) }}
  </h1>
</template>
