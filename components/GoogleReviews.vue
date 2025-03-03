<script setup>
import { onMounted, ref } from 'vue'

const reviewData = ref(null)
const loading = ref(true)
const error = ref(null)

async function fetchReviews() {
  try {
    const response = await fetch('/api/reviews')
    const data = await response.json()
    if (data.error) {
      throw new Error(data.error)
    }

    reviewData.value = data
  }
  catch (err) {
    error.value = err.message
  }
  finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchReviews()
})
</script>

<template>
  <BoxContainer class="marg bg-slate-100">
    <template #title>
      <div class="flex items-center">
        Google Reviews
        <div v-if="reviewData" class="flex items-center ml-4">
          <div class="flex text-yellow-400">
            <span v-for="i in 5" :key="i" class="mr-1">
              <svg v-if="i <= Math.round(reviewData.rating)" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-300" viewBox="0 0 20 20" fill="currentColor">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </span>
          </div>
          <span class="ml-1 text-sm font-medium">{{ reviewData.rating.toFixed(1) }}/5</span>
          <span class="ml-2 text-sm">({{ reviewData.totalReviews }} reviews)</span>
        </div>
      </div>
    </template>
    <div class="google-reviews">
      <!-- Header -->

      <!-- States -->
      <div v-if="loading" class="py-8 text-center">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
        <p class="mt-2 text-gray-600">
          Loading reviews...
        </p>
      </div>

      <div v-else-if="error" class="bg-red-50 p-4 rounded text-red-600">
        {{ error }}
      </div>

      <!-- Reviews List -->
      <div v-else-if="reviewData?.reviews?.length" class="space-y-4 mt-4">
        <div
          v-for="(review, index) in reviewData.reviews" :key="index"
          class="p-4 bg-white rounded shadow-lg border border-gray-100"
        >
          <div class="flex items-start">
            <img
              v-if="review.profilePhoto" :src="review.profilePhoto"
              alt="Profile" class="h-10 w-10 rounded-full mr-3"
            >
            <div v-else class="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center mr-3">
              <span class="text-gray-500">{{ review.author.charAt(0) }}</span>
            </div>

            <div class="flex-1">
              <div class="font-medium">
                {{ review.author }}
              </div>
              <div class="flex text-yellow-400 my-1">
                <span v-for="i in 5" :key="i" class="mr-1">
                  <svg
                    v-if="i <= review.rating" xmlns="http://www.w3.org/2000/svg"
                    class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <svg
                    v-else xmlns="http://www.w3.org/2000/svg"
                    class="h-4 w-4 text-gray-300" viewBox="0 0 20 20" fill="currentColor"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </span>
              </div>

              <p class="text-gray-700 text-sm mt-1">
                {{ review.text }}
              </p>
              <div class="text-gray-500 text-xs mt-2">
                {{ review.relativeTimeDescription }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="p-4 bg-gray-50 rounded text-gray-600">
        <p>No reviews available yet.</p>
      </div>
    </div>
  </BoxContainer>
</template>

<style>
.marg {
  margin-top: 40px !important;
}
</style>
