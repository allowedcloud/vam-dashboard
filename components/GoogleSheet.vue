<script setup>
const sheetUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQRoR0uoLPOdFHS8ExngxRmgtU742hh6kn4WrsM-C7UgMsQD2wjc273Ol4a1olkSmtDfwXW_l_T-wqe/pubhtml?' + 
  'widget=true' +  // Makes it more compact
  '&headers=false' + // Hides Google Sheets header
  '&chrome=false' +  // Removes UI chrome
  '&rm=minimal' +
  '&gid=0';         // Specifies which sheet tab to show
</script>

<template>
    <div class="border-2 border-red-500 border-solid sheet-wrapper">
      <iframe 
        :src="sheetUrl"
        frameborder="0"
        style="width: 100%; height: 600px;"
      ></iframe>
    </div>
</template>

<style scoped>
.sheet-wrapper {
  position: relative;
  width: 100%;
  height: calc(100vh - 526px); /* adjust as needed */
  overflow: hidden;
}

.sheet-wrapper iframe {
  width: 100%;
  height: calc(100% + 50px); /* hide bottom bar by making iframe taller */
  margin-bottom: -50px; /* pull up to hide bottom bar */
}
</style>