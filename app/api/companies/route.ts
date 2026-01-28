import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q') || ''
  const limit = parseInt(searchParams.get('limit') || '20', 10)

  const supabase = createServerClient()

  try {
    // Note: LoopBrowse_Protokoll uses 'orgnummer' and 'bolag' as column names
    let queryBuilder = supabase
      .from('LoopBrowse_Protokoll')
      .select('orgnummer, bolag')
      .order('bolag', { ascending: true })
      .limit(limit)

    if (query) {
      queryBuilder = queryBuilder.or(`bolag.ilike.%${query}%,orgnummer.ilike.%${query}%`)
    }

    const { data, error } = await queryBuilder

    if (error) {
      console.error('Error fetching companies:', error)
      return NextResponse.json({ error: 'Failed to fetch companies' }, { status: 500 })
    }

    // Return companies with all formats for compatibility
    const companies = (data || []).map(item => ({
      // Format expected by FollowCompanies
      org_number: item.orgnummer,
      company_name: item.bolag || 'Okänt bolag',
      // WatchList format
      id: item.orgnummer,
      name: item.bolag || 'Okänt bolag',
      orgNumber: item.orgnummer,
      status: 'quiet' as const,
      activityCount: 0
    }))

    return NextResponse.json({
      companies,
      total: companies.length,
    })
  } catch (error) {
    console.error('Companies API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
