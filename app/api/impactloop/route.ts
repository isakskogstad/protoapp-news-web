import { NextRequest, NextResponse } from 'next/server'

const IMPACTLOOP_PROXY_URL = process.env.IMPACTLOOP_PROXY_URL || 'https://impactloop-proxy.up.railway.app'

interface ImpactLoopItem {
  title: string
  url: string
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q')
  const limit = parseInt(searchParams.get('limit') || '5', 10)
  const articleUrl = searchParams.get('url')

  if (!query && !articleUrl) {
    return NextResponse.json(
      { items: [], count: 0, error: 'Query parameter "q" or "url" is required' },
      { status: 400 }
    )
  }

  try {
    // Try Railway proxy first
    let items: ImpactLoopItem[] = []
    let source = 'proxy'

    try {
      let proxyUrl: string

      if (articleUrl) {
        proxyUrl = `${IMPACTLOOP_PROXY_URL}/impactloop/article?url=${encodeURIComponent(articleUrl)}`
      } else {
        proxyUrl = `${IMPACTLOOP_PROXY_URL}/impactloop?q=${encodeURIComponent(query!)}&limit=${limit}`
      }

      const proxyResponse = await fetch(proxyUrl, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(5000), // 5 second timeout
      })

      if (proxyResponse.ok) {
        const proxyData = await proxyResponse.json()
        if (proxyData.items && proxyData.items.length > 0) {
          items = proxyData.items
        }
      }
    } catch (proxyError) {
      console.log('ImpactLoop proxy unavailable, falling back to direct scraping')
    }

    // Fallback to direct scraping if proxy failed
    if (items.length === 0 && query) {
      source = 'direct'
      items = await scrapeImpactLoopDirect(query, limit)
    }

    return NextResponse.json({
      items,
      count: items.length,
      queried: query || articleUrl,
      source,
      cachedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error fetching from ImpactLoop:', error)
    return NextResponse.json({
      items: [],
      count: 0,
      error: 'Failed to fetch from ImpactLoop'
    })
  }
}

async function scrapeImpactLoopDirect(query: string, limit: number): Promise<ImpactLoopItem[]> {
  const queryLower = query.toLowerCase()
  const items: ImpactLoopItem[] = []
  const seenUrls = new Set<string>()

  // Try search page first
  try {
    const searchUrl = `https://www.impactloop.se/search?query=${encodeURIComponent(query)}`
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(10000),
    })

    if (response.ok) {
      const html = await response.text()
      extractArticlesFromHTML(html, queryLower, items, seenUrls, limit)
    }
  } catch (e) {
    console.log('Search page scrape failed:', e)
  }

  // Try category page as fallback
  if (items.length === 0) {
    try {
      const categoryUrl = `https://www.impactloop.se/kategori/${encodeURIComponent(queryLower)}`
      const response = await fetch(categoryUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml',
        },
        signal: AbortSignal.timeout(10000),
      })

      if (response.ok) {
        const html = await response.text()
        extractArticlesFromHTML(html, queryLower, items, seenUrls, limit)
      }
    } catch (e) {
      console.log('Category page scrape failed:', e)
    }
  }

  return items.slice(0, limit)
}

function extractArticlesFromHTML(
  html: string,
  queryLower: string,
  items: ImpactLoopItem[],
  seenUrls: Set<string>,
  limit: number
): void {
  // Pattern to find article links
  const patterns = [
    /<a[^>]+href="(\/artikel\/[^"]+)"[^>]*>([^<]+(?:<[^/a][^>]*>[^<]*)*)<\/a>/gi,
    /<a[^>]+href="(https?:\/\/(?:www\.)?impactloop\.se\/artikel\/[^"]+)"[^>]*>([^<]+)<\/a>/gi,
    /<h[23][^>]*>\s*<a[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/gi,
  ]

  for (const pattern of patterns) {
    let match
    while ((match = pattern.exec(html)) !== null && items.length < limit) {
      let url = match[1]
      let title = match[2]
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim()

      // Skip empty or too short titles
      if (!title || title.length < 10) continue

      // Skip if title doesn't contain query (relevance check)
      if (!title.toLowerCase().includes(queryLower)) continue

      // Skip navigation items
      if (/^(sök|meny|logga in|hem|om oss|kontakt)$/i.test(title)) continue

      // Make URL absolute
      if (url.startsWith('/')) {
        url = `https://www.impactloop.se${url}`
      }

      // Skip duplicates
      if (seenUrls.has(url)) continue
      seenUrls.add(url)

      // Only include impactloop.se URLs
      if (!url.includes('impactloop.se')) continue

      items.push({ title, url })
    }
  }
}
