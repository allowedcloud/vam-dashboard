<script setup>
const sheetUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRUmyib_tbqscDP4P-WaTug1HZNbUOC2KpUA0dYjrzWtfCzK3XMrSOXdvgKo4JRQdgB1jARfgDHgkxg/pubhtml?'
  + 'widget=true' // Makes it more compact
  + '&headers=false' // Hides Google Sheets header
  + '&chrome=false' // Removes UI chrome
  + '&rm=minimal'
  + '&gid=0' // Specifies which sheet tab to show
</script>

<template>
  <BoxContainer class="bg-slate-100">
    <template #title>
      April Bonus Program
    </template>
    <div class="sheet-wrapper mt-4">
      <iframe
        :src="sheetUrl"
        frameborder="0"
        style="width: 100%; height: 675px;"
      />
    </div>
  </BoxContainer>
</template>

<style scoped>
.sheet-wrapper {
  position: relative;
  width: 100%;
  overflow: hidden;
  zoom: 120%;
}

.sheet-wrapper iframe {
  width: 100%;
  margin-bottom: -50px; /* pull up to hide bottom bar */
}
</style>
