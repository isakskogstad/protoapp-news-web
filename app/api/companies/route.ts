import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q') || ''
  const limit = parseInt(searchParams.get('limit') || '20', 10)

  const supabase = createServerClient()

  try {
    let queryBuilder = supabase
      .from('LoopBrowse_Protokoll')
      .select('org_number, company_name')
      .order('company_name', { ascending: true })
      .limit(limit)

    if (query) {
      queryBuilder = queryBuilder.ilike('company_name', `%${query}%`)
    }

    const { data, error } = await queryBuilder

    if (error) {
      console.error('Error fetching companies:', error)
      return NextResponse.json({ error: 'Failed to fetch companies' }, { status: 500 })
    }

    return NextResponse.json({
      companies: data || [],
      total: data?.length || 0,
    })
  } catch (error) {
    console.error('Companies API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
