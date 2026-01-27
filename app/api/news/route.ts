import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { protocolToNewsItem, kungorelseToNewsItem } from '@/lib/utils'
import { ProtocolAnalysis, Kungorelse, NewsItem } from '@/lib/types'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const limit = parseInt(searchParams.get('limit') || '20')
  const offset = parseInt(searchParams.get('offset') || '0')
  const type = searchParams.get('type') // 'protocol' | 'kungorelse' | null (both)

  const supabase = createServerClient()

  try {
    const items: NewsItem[] = []

    // Fetch protocol analyses
    if (!type || type === 'protocol') {
      const { data: protocols, error: protocolError } = await supabase
        .from('ProtocolAnalysis')
        .select('*')
        .order('analyzed_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (protocolError) throw protocolError

      if (protocols) {
        items.push(...protocols.map((p: ProtocolAnalysis) => protocolToNewsItem(p)))
      }
    }

    // Fetch kungorelser
    if (!type || type === 'kungorelse') {
      const { data: kungorelser, error: kungorelseError } = await supabase
        .from('Kungorelser')
        .select('*')
        .order('publicerad', { ascending: false })
        .range(offset, offset + limit - 1)

      if (kungorelseError) throw kungorelseError

      if (kungorelser) {
        items.push(...kungorelser.map((k: Kungorelse) => kungorelseToNewsItem(k)))
      }
    }

    // Sort by timestamp (newest first)
    items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    // Limit total results
    const limitedItems = items.slice(0, limit)

    return NextResponse.json({
      items: limitedItems,
      total: items.length,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Error fetching news:', error)
    return NextResponse.json(
      { error: 'Failed to fetch news' },
      { status: 500 }
    )
  }
}
