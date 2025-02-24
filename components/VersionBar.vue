<script setup>
const versionInfo = useVersion()
</script>

<template>
  <div class="bg-[#3D4EFF] text-white flex justify-between px-4">
    <div>
      VAM Office Dashboard
    </div>
    <div class="flex">
      <div>Version: {{ versionInfo.version }}</div>
      <div>Last Updated: {{ versionInfo.formatLastUpdated('date') }}</div>
    </div>
  </div>
</template>
