<script setup>
const announcements = [
  'Hello, World!',
  'Great job this week team!',
  'No claims so far for the month!',
  'Make sure to stay hydrated',
  'Austin said DON\'T DO IT',
  'We have a YUGE move on Friday, get some rest!',
]
</script>

<template>
  <BoxContainer>
    <template #title>
      Announcements
    </template>
    <Marquee>
      <span v-for="(announcement, index) in announcements" :key="index" class="mx-4 text-2xl" :style="{ color: index % 2 === 0 ? '#3D4EFF' : 'black' }">
        {{ announcement }}
      </span>
    </Marquee>
  </BoxContainer>
</template>
