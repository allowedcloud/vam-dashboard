<script setup>
const versionInfo = useVersion()
</script>

<template>
  <div class="font-mono bg-[#3D4EFF] text-white flex justify-between px-4">
    <div>
      VAM Office Dashboard
    </div>
    <div class="flex">
      <div>Version: {{ versionInfo.version }}</div>
      <div class="ml-2">
        Last Updated: {{ versionInfo.formatLastUpdated('date') }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.annc {
  font-family: 'Space Mono' !important
}
</style>
