<template>
  <div class="h-screen flex flex-col">
    <div class="p-6">
      <VersionBar />
      <Header />
      <Announcements />
    </div>
    <div class="flex-1 px-6">
      <div class="grid grid-cols-12 gap-6">
        <!-- Left column - GoogleSheet -->
        <div class="col-span-8">
          <GoogleSheet />
        </div>

        <!-- Right column - Schedule and Weather -->
        <div class="col-span-4">
          <div class="space-y-6">
            <ScheduleDisplay />
            <Weather />
            <GoogleReviews />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
