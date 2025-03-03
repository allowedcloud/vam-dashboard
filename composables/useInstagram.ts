import { ref } from 'vue'

export const useInstagram = () => {
  const posts = ref([])
  const loading = ref(false)
  const error = ref(null)

  // Fetch Instagram posts
  const fetchPosts = async () => {
    loading.value = true
    error.value = null

    try {
      const { data: response } = await useFetch('/api/instagram')
      
      if (!response.value?.success) {
        throw new Error(response.value?.error || 'Failed to fetch Instagram posts')
      }

      posts.value = response.value.data || []
    } catch (err) {
      console.error('Error fetching Instagram posts:', err)
      error.value = err instanceof Error ? err.message : 'Failed to fetch Instagram posts'
    } finally {
      loading.value = false
    }
  }

  // Format post data for display
  const formatPosts = () => {
    return posts.value.map(post => ({
      id: post.id,
      caption: post.caption || '',
      mediaUrl: post.media_url,
      permalink: post.permalink,
      thumbnailUrl: post.thumbnail_url || post.media_url,
      timestamp: new Date(post.timestamp),
      username: post.username,
      type: post.media_type.toLowerCase()
    }))
  }

  return {
    posts,
    loading,
    error,
    fetchPosts,
    formatPosts
  }
}