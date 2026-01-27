import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgNumber: string }> }
) {
  const { orgNumber } = await params
  const supabase = createServerClient()

  // Clean org number - remove dashes for query
  const cleanOrgNumber = orgNumber.replace(/-/g, '')

  // Try to find company data from LoopBrowse_Protokoll table
  // Column is 'orgnummer' (not 'org_number')
  const { data: company, error } = await supabase
    .from('LoopBrowse_Protokoll')
    .select('*')
    .eq('orgnummer', cleanOrgNumber)
    .single()

  if (error || !company) {
    // Also try with dashes
    const { data: company2 } = await supabase
      .from('LoopBrowse_Protokoll')
      .select('*')
      .eq('orgnummer', orgNumber)
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
    vd: company.vd || null,
    ordforande: company.ordforande || null,
    anstallda: company.anstallda ? Number(company.anstallda) : null,
    omsattning: null, // Not in this table
    omsattningAr: null,
    startat: company.registreringsdatum || null,
    bransch: null, // Not in this table
    stad: company.stad || null,
    adress: company.adress || null,
    postnummer: company.postnummer || null,
    storstAgare: company.storsta_agare || null,
  }
}
