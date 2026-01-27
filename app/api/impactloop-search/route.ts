import { NextRequest, NextResponse } from 'next/server'

interface Article {
  title: string
  url: string
  excerpt?: string
  publishedDate?: string
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q') || ''
  const limit = parseInt(searchParams.get('limit') || '5', 10)

  if (!query) {
    return NextResponse.json({ articles: [], error: 'Missing query parameter' }, { status: 400 })
  }

  try {
    // Fetch from Impact Loop search page
    const searchUrl = `https://www.impactloop.se/search?query=${encodeURIComponent(query)}`

    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'sv-SE,sv;q=0.9,en;q=0.8',
      },
      next: { revalidate: 300 } // Cache for 5 minutes
    })

    if (!response.ok) {
      console.error('Impact Loop fetch failed:', response.status)
      return NextResponse.json({ articles: [], source: 'impactloop', error: 'Fetch failed' })
    }

    const html = await response.text()

    // Parse the HTML to extract articles
    const articles = parseImpactLoopHTML(html, limit)

    return NextResponse.json({
      articles,
      source: 'impactloop',
      searchUrl,
      total: articles.length
    })

  } catch (error) {
    console.error('Impact Loop search error:', error)
    return NextResponse.json({
      articles: [],
      source: 'impactloop',
      error: 'Failed to fetch from Impact Loop'
    })
  }
}

function parseImpactLoopHTML(html: string, limit: number): Article[] {
  const articles: Article[] = []

  // Look for article links in the search results
  // Impact Loop uses a pattern like <a href="/post/...">...</a>

  // Try to find article cards/items
  // Common patterns: /post/, /artikel/, /article/, /news/
  const articlePatterns = [
    // Pattern 1: Links with /post/ path
    /<a[^>]+href="(\/post\/[^"]+)"[^>]*>([^<]*(?:<[^a][^>]*>[^<]*)*)<\/a>/gi,
    // Pattern 2: Links with full URL to impactloop
    /<a[^>]+href="(https?:\/\/(?:www\.)?impactloop\.se\/[^"]+)"[^>]*>([^<]*(?:<[^a][^>]*>[^<]*)*)<\/a>/gi,
    // Pattern 3: Article titles in h2/h3 tags
    /<h[23][^>]*>\s*<a[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/gi,
  ]

  const seenUrls = new Set<string>()

  for (const pattern of articlePatterns) {
    let match
    while ((match = pattern.exec(html)) !== null && articles.length < limit) {
      let url = match[1]
      let title = match[2]
        .replace(/<[^>]+>/g, '') // Remove HTML tags
        .replace(/\s+/g, ' ')    // Normalize whitespace
        .trim()

      // Skip if no meaningful title
      if (!title || title.length < 10) continue

      // Skip navigation/menu items
      if (title.toLowerCase().includes('sök') ||
          title.toLowerCase().includes('meny') ||
          title.toLowerCase().includes('logga in')) continue

      // Make URL absolute
      if (url.startsWith('/')) {
        url = `https://www.impactloop.se${url}`
      }

      // Skip if already seen
      if (seenUrls.has(url)) continue
      seenUrls.add(url)

      // Only include impactloop.se URLs
      if (!url.includes('impactloop.se')) continue

      articles.push({
        title,
        url,
      })
    }
  }

  // Fallback: Try to find any article-like content
  if (articles.length === 0) {
    // Look for structured article data
    const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)
    if (jsonLdMatch) {
      for (const jsonScript of jsonLdMatch) {
        try {
          const jsonContent = jsonScript.replace(/<script[^>]*>/, '').replace(/<\/script>/, '')
          const data = JSON.parse(jsonContent)

          if (data['@type'] === 'Article' || data['@type'] === 'NewsArticle') {
            articles.push({
              title: data.headline || data.name,
              url: data.url || data.mainEntityOfPage,
              publishedDate: data.datePublished ? new Date(data.datePublished).toLocaleDateString('sv-SE') : undefined
            })
          }

          if (Array.isArray(data.itemListElement)) {
            for (const item of data.itemListElement) {
              if (item.item && articles.length < limit) {
                articles.push({
                  title: item.item.name || item.name,
                  url: item.item.url || item.item['@id'],
                })
              }
            }
          }
        } catch (e) {
          // Ignore JSON parse errors
        }
      }
    }
  }

  return articles.slice(0, limit)
}
