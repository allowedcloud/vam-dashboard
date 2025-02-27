<script setup lang="ts">

interface Schedule {
  customer: string;
  job_time: string;
  pack_hrs: number;
  est_hrs: number;
  men: number;
  trucks: number;
  est_cost: number;
  est_lbs: number;
  est_cuft: number;
  'org-dest': string;
  contentId: string;
}

interface ScheduleResponse {
  schedules: Record<string, Schedule>;
  timestamp: string;
  totalSchedules: number;
}

const { data: scheduleData, error, pending } = await useFetch<ScheduleResponse>('/api/schedule')

const shouldDisplayTime = (time: string): boolean => {
  return time !== "8:00am-09:00am";
}
</script>

<template>
  <BoxContainer>
    <template #title>
      Today's Schedule
    </template>
  <div class="p-4">
    <div v-if="pending" class="text-center">
      Loading schedules...
    </div>

    <div v-else-if="error" class="text-red-600">
      Error loading schedules: {{ error.message }}
    </div>

    <div v-else>
      <div class="grid gap-4">
        <div v-for="(schedule, key) in scheduleData?.schedules"
             :key="schedule.contentId"
             class="bg-slate-100 shadow-lg rounded-lg p-4">
          <div class="flex justify-between items-start mb-2">
            <h3 class="text-xl font-bold">{{ schedule.customer }}</h3>
          <div class="text-gray-600">
            <span class="font-medium">Route:</span>
            <span class="ml-1">{{ schedule['org-dest'] }}</span>
          </div>
            <span v-if="shouldDisplayTime(schedule.job_time)"
                  class="text-red-600 font-medium">
              {{ schedule.job_time }}
            </span>
          </div>

          <div class="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
            <div>
              <span class="text-gray-600">Pack Hours:</span>
              <span class="ml-1 font-medium">{{ schedule.pack_hrs }}</span>
            </div>
            <div>
              <span class="text-gray-600">Est. Move Hours:</span>
              <span class="ml-1 font-medium">{{ schedule.est_hrs ? schedule.est_hrs : '?' }}</span>
            </div>
            <div>
              <span class="text-gray-600">Team:</span>
              <span class="ml-1 font-medium">{{ schedule.men ? `${schedule.men} men` : '? men' }}, {{ schedule.trucks === 1 ? '1 truck' : `${schedule.trucks} trucks` }}</span>
            </div>
          </div>

          <div class="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
            <div>
              <span class="text-gray-600">Est. Cost:</span>
              <span class="ml-1 font-medium text-green-600">${{ schedule.est_cost.toLocaleString() }}</span>
            </div>
            <div>
              <span class="text-gray-600">Est. Weight:</span>
              <span class="ml-1 font-medium">{{ schedule.est_lbs.toLocaleString() }} lbs</span>
            </div>
            <div>
              <span class="text-gray-600">Est. Volume:</span>
              <span class="ml-1 font-medium">{{ schedule.est_cuft }} cu.ft</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  </BoxContainer>
</template>