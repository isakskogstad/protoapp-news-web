import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgNumber: string }> }
) {
  const { orgNumber } = await params
  const supabase = createServerClient()

  // Try to find company data from LoopBrowse_Protokoll table
  const { data: company, error } = await supabase
    .from('LoopBrowse_Protokoll')
    .select('*')
    .eq('org_number', orgNumber)
    .single()

  if (error || !company) {
    // Try without dashes
    const cleanOrgNumber = orgNumber.replace(/-/g, '')
    const { data: company2 } = await supabase
      .from('LoopBrowse_Protokoll')
      .select('*')
      .eq('org_number', cleanOrgNumber)
      .single()

    if (!company2) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    return NextResponse.json(formatCompanyData(company2))
  }

  return NextResponse.json(formatCompanyData(company))
}

function formatCompanyData(company: Record<string, unknown>) {
  return {
    vd: company.vd || company.ceo || null,
    ordforande: company.ordforande || company.chairman || null,
    anstallda: company.anstallda || company.employees || null,
    omsattning: company.omsattning || company.revenue || null,
    omsattningAr: company.omsattning_ar || company.revenue_year || null,
    startat: company.grundat || company.founded || company.startat || null,
    bransch: company.bransch || company.industry || null,
  }
}
