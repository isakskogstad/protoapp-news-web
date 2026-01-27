import { NextRequest, NextResponse } from 'next/server'

const IMPACTLOOP_PROXY_URL = process.env.IMPACTLOOP_PROXY_URL || 'https://impactloop-proxy.up.railway.app'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q')
  const limit = searchParams.get('limit') || '5'
  const articleUrl = searchParams.get('url')

  if (!query && !articleUrl) {
    return NextResponse.json(
      { error: 'Query parameter "q" or "url" is required' },
      { status: 400 }
    )
  }

  try {
    let proxyUrl: string

    if (articleUrl) {
      // Fetch specific article
      proxyUrl = `${IMPACTLOOP_PROXY_URL}/impactloop/article?url=${encodeURIComponent(articleUrl)}`
    } else {
      // Search for articles
      proxyUrl = `${IMPACTLOOP_PROXY_URL}/impactloop?q=${encodeURIComponent(query!)}&limit=${limit}`
    }

    const response = await fetch(proxyUrl, {
      headers: {
        'Accept': 'application/json',
      },
      next: { revalidate: 300 }, // Cache for 5 minutes
    })

    if (!response.ok) {
      throw new Error(`Proxy responded with status ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching from ImpactLoop proxy:', error)
    return NextResponse.json(
      { error: 'Failed to fetch from ImpactLoop', articles: [] },
      { status: 500 }
    )
  }
}
