<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useInstagram } from '~/composables/useInstagram'

const { posts, loading, error, fetchPosts, formatPosts } = useInstagram()

const expandedCaptions = ref(new Set())
const maxCaptionLength = 100

const currentImageIndexes = ref({})
const carouselIntervals = ref({})
const formattedPosts = computed(() => formatPosts())

function initializeCarousel(postId, childrenLength) {
  if (childrenLength <= 1)
    return

  currentImageIndexes.value[postId] = 0

  carouselIntervals.value[postId] = setInterval(() => {
    currentImageIndexes.value[postId]
      = (currentImageIndexes.value[postId] + 1) % childrenLength
  }, 5000)
}

onBeforeUnmount(() => {
  Object.values(carouselIntervals.value).forEach((interval) => {
    clearInterval(interval)
  })
})
function formatDate(timestamp) {
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function truncateCaption(caption) {
  if (caption.length <= maxCaptionLength)
    return caption
  return `${caption.substring(0, maxCaptionLength)}...`
}

function expandCaption(postId) {
  expandedCaptions.value.add(postId)
}

watch(() => formattedPosts.value, (newPosts) => {
  newPosts.forEach((post) => {
    if (post.children?.length > 1) {
      initializeCarousel(post.id, post.children.length)
    }
  })
}, { immediate: true })

onMounted(() => {
  fetchPosts()
})
</script>

<template>
  <BoxContainer class="bg-slate-100">
    <template #title>
      Instagram
    </template>
    <div class="instagram-feed bg-slate-100">
      <div v-if="loading" class="instagram-feed__loading">
        <p>Loading Instagram feed...</p>
      </div>

      <div v-else-if="error" class="instagram-feed__error">
        <p>Error loading Instagram feed: {{ error }}</p>
        <button class="instagram-feed__retry-btn" @click="fetchPosts">
          Retry
        </button>
      </div>

      <div v-else-if="formattedPosts.length > 0" class="instagram-feed__grid">
        <div v-for="post in formattedPosts" :key="post.id" class="instagram-post">
          <a :href="post.permalink" target="_blank" rel="noopener noreferrer" class="instagram-post__link">
            <video
              v-if="post.type === 'video'"
              controls
              class="instagram-post__media"
              loading="lazy"
            >
              <source :src="post.mediaUrl" type="video/mp4">
              Your browser does not support video playback.
            </video>

            <div v-else class="instagram-post__media-container">
              <img
                v-if="!post.children?.length"
                :src="post.mediaUrl"
                :alt="`Instagram post by ${post.username}`"
                class="instagram-post__media"
                loading="lazy"
              >

              <transition-group v-else name="fade">
                <img
                  v-for="(child, index) in post.children"
                  v-show="currentImageIndexes[post.id] === index"
                  :key="`${post.id}-${index}`"
                  :src="child.mediaUrl"
                  :alt="`Instagram post by ${post.username}`"
                  class="instagram-post__media"
                  loading="lazy"
                >
              </transition-group>
            </div>
          </a>

          <div class="instagram-post__content">
            <div class="instagram-post__date">
              {{ formatDate(post.timestamp) }}
            </div>

            <p v-if="post.caption" class="instagram-post__caption">
              {{ expandedCaptions.has(post.id) ? post.caption : truncateCaption(post.caption) }}
              <button
                v-if="post.caption.length > maxCaptionLength && !expandedCaptions.has(post.id)"
                class="instagram-post__read-more"
                @click="expandCaption(post.id)"
              >
                Read more
              </button>
            </p>
          </div>
        </div>
      </div>

      <div v-else class="instagram-feed__empty">
        <p>No Instagram posts available.</p>
      </div>
    </div>
  </BoxContainer>
</template>

  <style scoped>
  .instagram-feed {
    margin: 2rem 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  }

  .instagram-feed__loading,
  .instagram-feed__error,
  .instagram-feed__empty {
    text-align: center;
    padding: 2rem;
    background: #f8f9fa;
    border-radius: 8px;
  }

  .instagram-feed__retry-btn {
    margin-top: 0.5rem;
    padding: 0.5rem 1rem;
    background: #0095f6;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 600;
  }

  .instagram-feed__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1.5rem;
  }

  .instagram-post {
    border-radius: 8px;
    overflow: hidden;
    background: white;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    transition: transform 0.3s ease, box-shadow 0.3s ease;
  }

  .instagram-post:hover {
    transform: translateY(-5px);
    box-shadow: 0 6px 15px rgba(0, 0, 0, 0.15);
  }

  .instagram-post__link {
    display: block;
  }

.instagram-post__media-container {
  position: relative;
    width: 100%;
    height: 300px;
  overflow: hidden;
  }

.instagram-post__media {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  position: absolute;
  top: 0;
  left: 0;
  }

.instagram-post__content {
  padding: 1rem;
  }

.instagram-post__date {
  font-size: 0.85rem;
  color: #8e8e8e;
  margin-bottom: 0.5rem;
  }

.instagram-post__caption {
  font-size: 0.95rem;
  line-height: 1.5;
  color: #262626;
  margin: 0;
}

.instagram-post__read-more {
    background: none;
    border: none;
    padding: 0;
    margin-left: 4px;
    color: #0095f6;
    font-weight: 600;
    cursor: pointer;
    font-size: 0.9rem;
  }

  .instagram-post__read-more:hover {
    text-decoration: underline;
  }

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.8s ease;
  position: absolute;
  top: 0;
  left: 0;
}

.fade-enter-active {
  transition-delay: 0s;
}

.fade-leave-active {
  transition-delay: 0s;
}

.fade-enter-from {
  opacity: 0;
}

.fade-leave-to {
  opacity: 0;
}

.fade-enter-to,
.fade-leave-from {
  opacity: 1;
}
  @media (max-width: 768px) {
    .instagram-feed__grid {
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 1rem;
    }

  .instagram-post__media-container {
      height: 250px;
    }
  }

  @media (max-width: 480px) {
    .instagram-feed__grid {
      grid-template-columns: repeat(auto-fill, minmax(100%, 1fr));
    }
  }
  </style>
