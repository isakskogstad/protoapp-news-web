import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { protocolToNewsItem, kungorelseToNewsItem } from '@/lib/utils'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerClient()
  const { id } = params

  try {
    // Try to find in ProtocolAnalysis first
    const { data: protocol, error: protocolError } = await supabase
      .from('ProtocolAnalysis')
      .select('*')
      .eq('id', id)
      .single()

    if (protocol && !protocolError) {
      return NextResponse.json({
        item: protocolToNewsItem(protocol),
        raw: protocol,
      })
    }

    // Try Kungorelser
    const { data: kungorelse, error: kungorelseError } = await supabase
      .from('Kungorelser')
      .select('*')
      .eq('id', id)
      .single()

    if (kungorelse && !kungorelseError) {
      return NextResponse.json({
        item: kungorelseToNewsItem(kungorelse),
        raw: kungorelse,
      })
    }

    return NextResponse.json(
      { error: 'News item not found' },
      { status: 404 }
    )
  } catch (error) {
    console.error('Error fetching news item:', error)
    return NextResponse.json(
      { error: 'Failed to fetch news item' },
      { status: 500 }
    )
  }
}
