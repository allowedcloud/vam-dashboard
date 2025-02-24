<template>
  <VersionBar />
  <div class="min-h-screen w-full bg-gray-50 p-6">
    <Header />
    <Weather />
    <ScheduleDisplay />
    <GoogleSheet />
    <BoxContainer>
      <template #title>
        Weather
      </template>
      Hello, world! This is the content of the box
    </BoxContainer>
  </div>
</template>
