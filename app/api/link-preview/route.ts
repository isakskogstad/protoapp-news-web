import { NextRequest, NextResponse } from 'next/server'

interface LinkPreviewData {
  url: string
  title?: string
  description?: string
  image?: string
  siteName?: string
  favicon?: string
}

// Simple in-memory cache for link previews
const cache = new Map<string, { data: LinkPreviewData; timestamp: number }>()
const CACHE_TTL = 1000 * 60 * 60 // 1 hour

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')

  if (!url) {
    return NextResponse.json({ error: 'URL required' }, { status: 400 })
  }

  // Check cache
  const cached = cache.get(url)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json(cached.data)
  }

  try {
    // Fetch the URL with timeout
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LoopDesk/1.0; +https://loopdesk.se)',
        'Accept': 'text/html,application/xhtml+xml',
      },
    })
    clearTimeout(timeout)

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`)
    }

    const html = await response.text()

    // Parse Open Graph and meta tags
    const preview = parseMetadata(html, url)

    // Cache the result
    cache.set(url, { data: preview, timestamp: Date.now() })

    return NextResponse.json(preview)
  } catch (error) {
    console.error('Error fetching link preview:', error)

    // Return minimal preview on error
    const fallback: LinkPreviewData = {
      url,
      title: new URL(url).hostname,
    }
    return NextResponse.json(fallback)
  }
}

function parseMetadata(html: string, url: string): LinkPreviewData {
  const preview: LinkPreviewData = { url }

  // Helper to extract meta content
  const getMeta = (property: string): string | undefined => {
    // Try og: property
    const ogMatch = html.match(new RegExp(`<meta[^>]*property=["']og:${property}["'][^>]*content=["']([^"']+)["']`, 'i'))
    if (ogMatch) return ogMatch[1]

    // Try twitter: property
    const twitterMatch = html.match(new RegExp(`<meta[^>]*name=["']twitter:${property}["'][^>]*content=["']([^"']+)["']`, 'i'))
    if (twitterMatch) return twitterMatch[1]

    // Try content first format
    const contentFirstOg = html.match(new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:${property}["']`, 'i'))
    if (contentFirstOg) return contentFirstOg[1]

    // Try name meta
    const nameMatch = html.match(new RegExp(`<meta[^>]*name=["']${property}["'][^>]*content=["']([^"']+)["']`, 'i'))
    if (nameMatch) return nameMatch[1]

    return undefined
  }

  // Get title
  preview.title = getMeta('title')
  if (!preview.title) {
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    preview.title = titleMatch ? titleMatch[1].trim() : undefined
  }

  // Get description
  preview.description = getMeta('description')

  // Get image
  preview.image = getMeta('image')
  // Make relative URLs absolute
  if (preview.image && !preview.image.startsWith('http')) {
    const base = new URL(url)
    preview.image = new URL(preview.image, base.origin).href
  }

  // Get site name
  preview.siteName = getMeta('site_name')
  if (!preview.siteName) {
    preview.siteName = new URL(url).hostname.replace('www.', '')
  }

  // Get favicon
  const faviconMatch = html.match(/<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["']/i)
  if (faviconMatch) {
    const faviconUrl = faviconMatch[1]
    if (faviconUrl.startsWith('http')) {
      preview.favicon = faviconUrl
    } else {
      const base = new URL(url)
      preview.favicon = new URL(faviconUrl, base.origin).href
    }
  } else {
    // Default to /favicon.ico
    const base = new URL(url)
    preview.favicon = `${base.origin}/favicon.ico`
  }

  return preview
}
