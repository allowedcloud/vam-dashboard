import { defineEventHandler } from 'h3'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  // Get Instagram account ID and access token from environment variables
  const instagramAccountId = config.instagramAccountId
  const instagramAccessToken = config.instagramAccessToken

  try {
    // Instagram Graph API endpoint
    const limit = 12
    // const apiUrl = `https://graph.instagram.com/v18.0/${instagramAccountId}/media?fields=id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,username&limit=${limit}&access_token=${instagramAccessToken}`
    const apiUrl = `https://graph.instagram.com/v18.0/${instagramAccountId}/media?fields=id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,username,children{media_url,media_type,thumbnail_url}&limit=${limit}&access_token=${instagramAccessToken}`

    const response = await fetch(apiUrl)

    if (!response.ok) {
      throw new Error(`Failed to fetch Instagram posts: ${response.statusText}`)
    }

    const data = await response.json()
    return {
      success: true,
      data: data.data || []
    }
  } catch (err) {
    console.error('Error fetching Instagram posts:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch Instagram posts'
    }
  }
})