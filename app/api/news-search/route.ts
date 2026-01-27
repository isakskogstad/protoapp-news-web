import { NextRequest, NextResponse } from 'next/server'

interface NewsArticle {
  title: string
  url: string
  source?: string
  publishedDate?: string
}

// Simple Google News RSS parser
async function searchGoogleNews(query: string, limit: number = 5): Promise<NewsArticle[]> {
  try {
    // Google News RSS feed URL
    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=sv&gl=SE&ceid=SE:sv`

    const response = await fetch(rssUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml',
      },
      next: { revalidate: 300 }, // Cache for 5 minutes
    })

    if (!response.ok) {
      throw new Error(`Google News responded with ${response.status}`)
    }

    const xml = await response.text()
    const articles = parseRSSFeed(xml, limit)

    return articles
  } catch (error) {
    console.error('Google News search failed:', error)
    return []
  }
}

// Parse RSS XML to extract articles
function parseRSSFeed(xml: string, limit: number): NewsArticle[] {
  const articles: NewsArticle[] = []

  // Simple regex-based XML parsing (works for RSS feeds)
  const itemRegex = /<item>([\s\S]*?)<\/item>/g
  const titleRegex = /<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/
  const linkRegex = /<link>(.*?)<\/link>/
  const pubDateRegex = /<pubDate>(.*?)<\/pubDate>/
  const sourceRegex = /<source[^>]*>(.*?)<\/source>|<source[^>]*><!\[CDATA\[(.*?)\]\]><\/source>/

  let match
  while ((match = itemRegex.exec(xml)) !== null && articles.length < limit) {
    const itemContent = match[1]

    const titleMatch = itemContent.match(titleRegex)
    const linkMatch = itemContent.match(linkRegex)
    const pubDateMatch = itemContent.match(pubDateRegex)
    const sourceMatch = itemContent.match(sourceRegex)

    const title = titleMatch ? (titleMatch[1] || titleMatch[2] || '').trim() : null
    const url = linkMatch ? linkMatch[1].trim() : null

    if (title && url) {
      // Parse date
      let publishedDate: string | undefined
      if (pubDateMatch) {
        try {
          const date = new Date(pubDateMatch[1])
          publishedDate = formatRelativeDate(date)
        } catch {
          // Ignore date parsing errors
        }
      }

      // Extract source
      const source = sourceMatch ? (sourceMatch[1] || sourceMatch[2] || '').trim() : undefined

      articles.push({
        title,
        url,
        source,
        publishedDate,
      })
    }
  }

  return articles
}

// Format date as relative (e.g., "2 timmar sedan")
function formatRelativeDate(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 60) {
    return `${diffMins} min sedan`
  } else if (diffHours < 24) {
    return `${diffHours} tim sedan`
  } else if (diffDays < 7) {
    return `${diffDays} dag${diffDays > 1 ? 'ar' : ''} sedan`
  } else {
    return date.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q')
  const limitParam = searchParams.get('limit')
  const limit = limitParam ? parseInt(limitParam, 10) : 5

  if (!query) {
    return NextResponse.json(
      { error: 'Query parameter "q" is required' },
      { status: 400 }
    )
  }

  try {
    const articles = await searchGoogleNews(query, limit)

    return NextResponse.json({
      query,
      articles,
      totalMatches: articles.length,
    })
  } catch (error) {
    console.error('News search error:', error)
    return NextResponse.json(
      { error: 'Failed to search news', articles: [] },
      { status: 500 }
    )
  }
}
