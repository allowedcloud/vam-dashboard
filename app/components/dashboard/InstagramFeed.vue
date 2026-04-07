<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import InstagramPostTile from '~/components/dashboard/InstagramPostTile.vue'

interface InstagramFrame {
  id: string
  mediaType: 'IMAGE' | 'VIDEO'
  imageUrl: string | null
  permalink: string
}

interface InstagramPost {
  id: string
  caption: string
  mediaType: string
  permalink: string
  timestamp: string | null
  frameCount: number
  frames: InstagramFrame[]
}

const props = defineProps<{
  posts: InstagramPost[]
}>()

const activePostIndex = ref(0)

let postRotationTimeout: ReturnType<typeof setTimeout> | undefined

const reducedMotion = computed(() => {
  if (!import.meta.client) {
    return false
  }

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
})

const activePost = computed(() => props.posts[activePostIndex.value] ?? null)

function stopPostRotation() {
  if (postRotationTimeout) {
    clearTimeout(postRotationTimeout)
    postRotationTimeout = undefined
  }
}

function scheduleNextPost() {
  stopPostRotation()

  if (!import.meta.client || reducedMotion.value || props.posts.length <= 1) {
    return
  }

  const frameCount = Math.max(1, activePost.value?.frameCount ?? 1)
  const duration = Math.min(16000, 4200 + (frameCount - 1) * 2600)

  postRotationTimeout = setTimeout(() => {
    activePostIndex.value = (activePostIndex.value + 1) % props.posts.length
  }, duration)
}

watch(() => props.posts.length, () => {
  if (!props.posts.length) {
    activePostIndex.value = 0
    stopPostRotation()
    return
  }

  activePostIndex.value = Math.min(activePostIndex.value, props.posts.length - 1)

  if (import.meta.client) {
    scheduleNextPost()
  }
}, { immediate: true })

watch(activePostIndex, () => {
  if (import.meta.client) {
    scheduleNextPost()
  }
})

onMounted(() => {
  scheduleNextPost()
})

onBeforeUnmount(() => {
  stopPostRotation()
})
</script>

<template>
  <div class="relative h-full min-h-0 w-full overflow-hidden">
    <Transition name="instagram-post">
      <InstagramPostTile
        v-if="activePost"
        :key="activePost.id"
        :post="activePost"
        :active="true"
        class="absolute inset-0 min-h-0"
      />
    </Transition>
  </div>
</template>

<style scoped>
.instagram-post-enter-active,
.instagram-post-leave-active {
  transition:
    opacity 950ms cubic-bezier(0.22, 1, 0.36, 1),
    transform 950ms cubic-bezier(0.22, 1, 0.36, 1);
}

.instagram-post-enter-from,
.instagram-post-leave-to {
  opacity: 0;
  transform: scale(1.015);
}

.instagram-post-enter-to,
.instagram-post-leave-from {
  opacity: 1;
  transform: scale(1);
}

@media (prefers-reduced-motion: reduce) {
  .instagram-post-enter-active,
  .instagram-post-leave-active {
    transition: none;
  }
}
</style>
