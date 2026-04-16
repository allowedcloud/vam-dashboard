<script setup lang="ts">
defineProps<{
  jobsCount: number
  totalPoundsLabel: string
}>()
</script>

<template>
  <div class="grid h-full min-h-0 grid-cols-2 gap-2">
    <div class="flex min-h-0 flex-col justify-center rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2.5 text-center">
      <p class="text-[12px] font-semibold uppercase tracking-[0.16em] text-slate-500">
        Jobs today
      </p>
      <p class="mt-3 font-mono text-[2.8rem] font-semibold tracking-tight text-slate-950 tabular-nums">
        {{ jobsCount }}
      </p>
    </div>

    <div class="flex min-h-0 flex-col justify-center rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2.5 text-center">
      <p class="text-[12px] font-semibold uppercase tracking-[0.16em] text-slate-500">
        Pounds today
      </p>
      <p class="mt-3 font-mono text-[2.45rem] font-semibold tracking-tight text-slate-950 tabular-nums">
        {{ totalPoundsLabel }}
      </p>
    </div>
  </div>
</template>
