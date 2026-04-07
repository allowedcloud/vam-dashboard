const ALLOWED_HOSTS = [
  'cdninstagram.com',
  'fbcdn.net',
] as const

function isAllowedInstagramHost(hostname: string) {
  return ALLOWED_HOSTS.some(host => hostname === host || hostname.endsWith(`.${host}`))
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const source = typeof query.source === 'string' ? query.source : ''

  if (!source) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing image source URL',
    })
  }

  let target: URL

  try {
    target = new URL(source)
  } catch {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid image source URL',
    })
  }

  if (target.protocol !== 'https:' || !isAllowedInstagramHost(target.hostname)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Blocked image host',
    })
  }

  try {
    const response = await fetch(target, {
      headers: {
        accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
    })

    if (!response.ok) {
      throw createError({
        statusCode: response.status,
        statusMessage: 'Instagram image fetch failed',
      })
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg'
    const cacheControl = response.headers.get('cache-control') || 'public, max-age=86400, stale-while-revalidate=604800'
    const payload = new Uint8Array(await response.arrayBuffer())
    return new Response(payload, {
      status: 200,
      headers: {
        'content-type': contentType,
        'cache-control': cacheControl,
        'cross-origin-resource-policy': 'same-origin',
      },
    })
  } catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    throw createError({
      statusCode: 502,
      statusMessage: 'Unable to proxy Instagram image',
    })
  }
})
