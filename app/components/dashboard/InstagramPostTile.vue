<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'

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
  post: InstagramPost
  active?: boolean
}>()

const activeFrameIndex = ref(0)
const failedFrameIds = ref<string[]>([])

let rotationInterval: ReturnType<typeof setInterval> | undefined

const reducedMotion = computed(() => {
  if (!import.meta.client) {
    return false
  }

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
})

const safeFrames = computed(() => {
  if (props.post.frames.length) {
    return props.post.frames
  }

  return [{
    id: `${props.post.id}-fallback`,
    mediaType: 'IMAGE' as const,
    imageUrl: null,
    permalink: props.post.permalink,
  }]
})

const activeFrame = computed(() => safeFrames.value[activeFrameIndex.value] ?? safeFrames.value[0])
const activeFrameFailed = computed(() => failedFrameIds.value.includes(activeFrame.value.id))

const postDate = computed(() => {
  if (!props.post.timestamp) {
    return ''
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(props.post.timestamp))
})

const captionPreview = computed(() => {
  return props.post.caption || 'Latest post from VA Moving.'
})

function stopRotation() {
  if (rotationInterval) {
    clearInterval(rotationInterval)
    rotationInterval = undefined
  }
}

function startRotation() {
  stopRotation()

  if (!import.meta.client || reducedMotion.value || safeFrames.value.length <= 1) {
    return
  }

  const baseDelay = 3600
  const offset = Array.from(props.post.id).reduce((sum, char) => sum + char.charCodeAt(0), 0) % 1200

  rotationInterval = setInterval(() => {
    activeFrameIndex.value = (activeFrameIndex.value + 1) % safeFrames.value.length
  }, baseDelay + offset)
}

function handleImageError(frameId: string) {
  if (!failedFrameIds.value.includes(frameId)) {
    failedFrameIds.value = [...failedFrameIds.value, frameId]
  }
}

watch(() => props.active, (isActive) => {
  if (!import.meta.client) {
    return
  }

  if (isActive === false) {
    stopRotation()
    return
  }

  activeFrameIndex.value = 0
  startRotation()
}, { immediate: true })

onBeforeUnmount(() => {
  stopRotation()
})
</script>

<template>
  <a
    :href="post.permalink || activeFrame.permalink || undefined"
    target="_blank"
    rel="noreferrer"
    class="group relative block h-full overflow-hidden rounded-xl border border-slate-200/80 bg-slate-950/95 shadow-[0_10px_24px_rgba(15,23,42,0.12)]"
  >
    <div class="relative h-full overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(61,78,255,0.22),_rgba(15,23,42,0.98)_68%)]">
      <template
        v-for="(frame, index) in safeFrames"
        :key="frame.id"
      >
        <img
          v-if="frame.imageUrl"
          :src="frame.imageUrl"
          :alt="captionPreview"
          @error="handleImageError(frame.id)"
          :class="[
            'absolute inset-0 h-full w-full object-cover transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none',
            index === activeFrameIndex ? 'scale-100 opacity-100' : 'scale-[1.03] opacity-0',
          ]"
        >
      </template>

      <div
        v-if="!activeFrame.imageUrl || activeFrameFailed"
        class="absolute inset-0 flex items-center justify-center bg-[linear-gradient(160deg,rgba(61,78,255,0.32),rgba(15,23,42,0.94))] px-4 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-white/88"
      >
        Image unavailable
      </div>

      <div class="absolute inset-x-0 top-0 flex items-center justify-between px-2 pt-2">
        <span class="rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/85 backdrop-blur-sm">
          {{ postDate || 'Recent' }}
        </span>
      </div>

      <div class="absolute inset-x-0 bottom-0 bg-[linear-gradient(180deg,rgba(15,23,42,0)_0%,rgba(15,23,42,0.18)_34%,rgba(15,23,42,0.68)_74%,rgba(15,23,42,0.9)_100%)] px-3 pb-3 pt-10">
        <p class="line-clamp-3 text-[15px] font-medium leading-[1.32] text-white/94">
          {{ captionPreview }}
        </p>
      </div>
    </div>
  </a>
</template>
