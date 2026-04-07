interface InstagramAccountResponse {
  id?: string
  username?: string
}

interface InstagramMediaItemResponse {
  id: string
  caption?: string
  media_type?: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM'
  media_url?: string
  thumbnail_url?: string
  permalink?: string
  timestamp?: string
}

interface InstagramMediaListResponse {
  data?: InstagramMediaItemResponse[]
}

interface InstagramFeedFrame {
  id: string
  mediaType: 'IMAGE' | 'VIDEO'
  imageUrl: string | null
  permalink: string
}

function normalizeCaption(value?: string) {
  return (value || '')
    .replace(/\s+/g, ' ')
    .trim()
}

function toImageUrl(item: InstagramMediaItemResponse) {
  if (item.media_type === 'VIDEO') {
    return item.thumbnail_url || null
  }

  return item.media_url || item.thumbnail_url || null
}

function toFrame(item: InstagramMediaItemResponse): InstagramFeedFrame {
  const sourceUrl = toImageUrl(item)

  return {
    id: item.id,
    mediaType: item.media_type === 'VIDEO' ? 'VIDEO' : 'IMAGE',
    imageUrl: sourceUrl ? `/api/dashboard/instagram-image?source=${encodeURIComponent(sourceUrl)}` : null,
    permalink: item.permalink || '',
  }
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const token = config.instagramApiToken

  if (!token) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Missing Instagram API token',
    })
  }

  try {
    const [account, media] = await Promise.all([
      $fetch<InstagramAccountResponse>('/me', {
        baseURL: 'https://graph.instagram.com',
        query: {
          fields: 'id,username',
          access_token: token,
        },
        retry: 0,
        timeout: 5000,
      }),
      $fetch<InstagramMediaListResponse>('/me/media', {
        baseURL: 'https://graph.instagram.com',
        query: {
          fields: 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp',
          limit: 10,
          access_token: token,
        },
        retry: 0,
        timeout: 5000,
      }),
    ])

    const posts = await Promise.all(
      (media.data ?? []).slice(0, 10).map(async (item) => {
        let frames = [toFrame(item)].filter(frame => frame.imageUrl)

        if (item.media_type === 'CAROUSEL_ALBUM') {
          try {
            const children = await $fetch<InstagramMediaListResponse>(`/${item.id}/children`, {
              baseURL: 'https://graph.instagram.com',
              query: {
                fields: 'id,media_type,media_url,thumbnail_url,permalink,timestamp',
                access_token: token,
              },
              retry: 0,
              timeout: 5000,
            })

            const childFrames = (children.data ?? [])
              .map(toFrame)
              .filter(frame => frame.imageUrl)

            if (childFrames.length) {
              frames = childFrames
            }
          } catch {
            // Fall back to the parent media when carousel expansion fails.
          }
        }

        return {
          id: item.id,
          caption: normalizeCaption(item.caption),
          mediaType: item.media_type || 'IMAGE',
          permalink: item.permalink || frames[0]?.permalink || '',
          timestamp: item.timestamp || null,
          frameCount: frames.length,
          frames,
        }
      }),
    )

    setHeader(event, 'cache-control', 'public, max-age=300, stale-while-revalidate=1800')

    return {
      accountHandle: account.username ? `@${account.username}` : '@instagram',
      posts,
      updatedAt: new Date().toISOString(),
    }
  } catch (error) {
    throw createError({
      statusCode: 502,
      statusMessage: `Unable to load Instagram feed${error instanceof Error && error.message ? `: ${error.message}` : ''}`,
    })
  }
})
