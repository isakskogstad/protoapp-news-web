import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orgNumber: string }> }
) {
  const { orgNumber } = await params
  const supabase = createServerClient()

  // Clean org number - remove dashes
  const cleanOrgNumber = orgNumber.replace(/-/g, '')

  // Format with dash in position 6 (XXXXXX-XXXX)
  const formattedOrgNumber = cleanOrgNumber.length === 10
    ? `${cleanOrgNumber.slice(0, 6)}-${cleanOrgNumber.slice(6)}`
    : orgNumber

  // Try formatted version first (database stores with dash: 556666-0170)
  const { data: company, error } = await supabase
    .from('LoopBrowse_Protokoll')
    .select('*')
    .eq('orgnummer', formattedOrgNumber)
    .single()

  if (error || !company) {
    // Also try original input as-is
    const { data: company2 } = await supabase
      .from('LoopBrowse_Protokoll')
      .select('*')
      .eq('orgnummer', orgNumber)
      .single()

    if (!company2) {
      // Finally try without dashes
      const { data: company3 } = await supabase
        .from('LoopBrowse_Protokoll')
        .select('*')
        .eq('orgnummer', cleanOrgNumber)
        .single()

      if (!company3) {
        return NextResponse.json({ error: 'Company not found' }, { status: 404 })
      }

      return NextResponse.json(formatCompanyData(company3))
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
