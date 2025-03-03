<script>
export default {
  name: 'BoxContainer',
}
</script>

<template>
  <div class="box-container">
    <div class="box-title font-bold text-xl">
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
  padding: 15px;
  margin: 40px 0;
}

.box-title {
  position: absolute;
  top: -0.8em;
  left: 15px;
  padding: 0 8px;
  background-color: white;
  color: #3D4EFF;
  border: 1px solid black;
  font-family: 'Lustria';
}

.box-content {
  font-family: 'Lato';
}
</style>
