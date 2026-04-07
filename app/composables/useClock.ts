export function useClock() {
  const now = ref<Date | null>(null)

  onMounted(() => {
    now.value = new Date()

    const interval = setInterval(() => {
      now.value = new Date()
    }, 1000)
    onUnmounted(() => clearInterval(interval))
  })

  const date = computed(() => {
    if (!now.value) {
      return ''
    }

    return now.value.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
    })
  })

  const time = computed(() => {
    if (!now.value) {
      return ''
    }

    return now.value.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  })

  return { date, time }
}
