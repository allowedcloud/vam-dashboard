<script>
export default {
  name: 'BoxContainer',
}
</script>

<template>
  <div class="box-container">
    <div class="box-title">
      <slot name="title" />
    </div>
    <div class="box-content">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.box-container {
  position: relative;
  border: 1px solid black;
  padding: 20px;
  margin: 20px 0;
}

.box-title {
  position: absolute;
  top: -0.8em;
  left: 15px;
  padding: 0 8px;
  background-color: white;
  font-weight: bold;
}

.box-content {
  margin-top: 10px;
}
</style>
