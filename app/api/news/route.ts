import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { protocolToNewsItem, kungorelseToNewsItem } from '@/lib/utils'
import { ProtocolAnalysis, Kungorelse, NewsItem } from '@/lib/types'

// Cutoff date for kungörelser - only fetch from 2026-01-22 and later
const KUNGORELSE_CUTOFF_DATE = '2026-01-22'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const limit = parseInt(searchParams.get('limit') || '20')
  const offset = parseInt(searchParams.get('offset') || '0')
  const type = searchParams.get('type') // 'protocol' | 'kungorelse' | null (both)

  const supabase = createServerClient()

  try {
    // If filtering by type, use simple pagination
    if (type === 'protocol') {
      const { data: protocols, error, count } = await supabase
        .from('ProtocolAnalysis')
        .select('*', { count: 'exact' })
        .order('analyzed_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) throw error

      return NextResponse.json({
        items: (protocols || []).map((p: ProtocolAnalysis) => protocolToNewsItem(p)),
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit,
      })
    }

    if (type === 'kungorelse') {
      const { data: kungorelser, error, count } = await supabase
        .from('Kungorelser')
        .select('*', { count: 'exact' })
        .gte('publicerad', KUNGORELSE_CUTOFF_DATE)
        .order('publicerad', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) throw error

      return NextResponse.json({
        items: (kungorelser || []).map((k: Kungorelse) => kungorelseToNewsItem(k)),
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit,
      })
    }

    // Combined pagination: fetch more than needed, merge, sort, then slice
    // To ensure correct pagination, we fetch (offset + limit) items from each table
    // then merge, sort by timestamp, and return the correct slice
    const fetchLimit = offset + limit

    const [protocolResult, kungorelseResult] = await Promise.all([
      supabase
        .from('ProtocolAnalysis')
        .select('*', { count: 'exact' })
        .order('analyzed_at', { ascending: false })
        .limit(fetchLimit),
      supabase
        .from('Kungorelser')
        .select('*', { count: 'exact' })
        .gte('publicerad', KUNGORELSE_CUTOFF_DATE)
        .order('publicerad', { ascending: false })
        .limit(fetchLimit),
    ])

    if (protocolResult.error) throw protocolResult.error
    if (kungorelseResult.error) throw kungorelseResult.error

    // Convert to NewsItems
    const protocolItems = (protocolResult.data || []).map((p: ProtocolAnalysis) => protocolToNewsItem(p))
    const kungorelseItems = (kungorelseResult.data || []).map((k: Kungorelse) => kungorelseToNewsItem(k))

    // Merge and sort by timestamp (newest first)
    const allItems = [...protocolItems, ...kungorelseItems]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    // Apply correct pagination: skip 'offset' items, take 'limit' items
    const paginatedItems = allItems.slice(offset, offset + limit)

    // Calculate total (approximate - sum of both tables)
    const totalCount = (protocolResult.count || 0) + (kungorelseResult.count || 0)

    return NextResponse.json({
      items: paginatedItems,
      total: totalCount,
      limit,
      offset,
      hasMore: allItems.length > offset + limit,
    })
  } catch (error) {
    console.error('Error fetching news:', error)
    return NextResponse.json(
      { error: 'Failed to fetch news' },
      { status: 500 }
    )
  }
}
