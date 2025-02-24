<template>
  <VersionBar />
  <div class="min-h-screen w-full bg-gray-50 p-6">
    <Header />
    <BoxContainer>
      <template #title>
        Announcements
      </template>
      <Announcements />
    </BoxContainer>
    <Weather />
    <ScheduleDisplay />
    <GoogleSheet />
  </div>
</template>
