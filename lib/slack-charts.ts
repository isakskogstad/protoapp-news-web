import { createServerClient } from './supabase'

// QuickChart.io URL builder
const QUICKCHART_BASE = 'https://quickchart.io/chart'

export interface ChartConfig {
  type: 'bar' | 'line' | 'pie' | 'doughnut'
  title: string
  labels: string[]
  datasets: {
    label: string
    data: number[]
    backgroundColor?: string[]
  }[]
}

// Generate chart URL using QuickChart.io
export function generateChartUrl(config: ChartConfig): string {
  const chartConfig = {
    type: config.type,
    data: {
      labels: config.labels,
      datasets: config.datasets.map(ds => ({
        label: ds.label,
        data: ds.data,
        backgroundColor: ds.backgroundColor || getDefaultColors(ds.data.length),
        borderColor: config.type === 'line' ? '#4A90D9' : undefined,
        fill: config.type === 'line' ? false : undefined
      }))
    },
    options: {
      title: {
        display: true,
        text: config.title,
        fontSize: 16
      },
      legend: {
        display: config.datasets.length > 1 || config.type === 'pie' || config.type === 'doughnut'
      },
      plugins: {
        datalabels: {
          display: config.type === 'pie' || config.type === 'doughnut',
          color: '#fff',
          font: { weight: 'bold' }
        }
      }
    }
  }

  const encodedConfig = encodeURIComponent(JSON.stringify(chartConfig))
  return `${QUICKCHART_BASE}?c=${encodedConfig}&w=600&h=400&bkg=white`
}

function getDefaultColors(count: number): string[] {
  const colors = [
    '#4A90D9', '#50C878', '#FFB347', '#FF6B6B', '#9B59B6',
    '#3498DB', '#2ECC71', '#F1C40F', '#E74C3C', '#8E44AD'
  ]
  return colors.slice(0, count)
}

// Generate emission trend chart
export async function generateEmissionChart(
  timeframeDays: number = 90
): Promise<{ url: string; title: string } | null> {
  const supabase = createServerClient()

  const startDate = new Date(Date.now() - timeframeDays * 24 * 60 * 60 * 1000)
    .toISOString().split('T')[0]

  const { data } = await supabase
    .from('ProtocolAnalysis')
    .select('protocol_date, extracted_data, calculations')
    .gte('protocol_date', startDate)
    .order('protocol_date', { ascending: true })

  if (!data || data.length === 0) return null

  // Group by month and sum emissions
  const monthlyData: Record<string, number> = {}

  data.forEach(item => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const extracted = item.extracted_data as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const calcs = item.calculations as any

    const emissionAmount =
      calcs?.emission?.emissionsbelopp_kr ||
      extracted?.kapitalåtgärder?.nyemission?.emissionsbelopp_kr ||
      0

    if (emissionAmount > 0) {
      const month = item.protocol_date.substring(0, 7) // YYYY-MM
      monthlyData[month] = (monthlyData[month] || 0) + emissionAmount
    }
  })

  const labels = Object.keys(monthlyData).sort()
  const values = labels.map(m => Math.round(monthlyData[m] / 1000000)) // Convert to MSEK

  if (labels.length === 0) return null

  const url = generateChartUrl({
    type: 'bar',
    title: `Nyemissioner (MSEK) - Senaste ${timeframeDays} dagar`,
    labels: labels.map(l => {
      const [year, month] = l.split('-')
      return `${month}/${year.slice(2)}`
    }),
    datasets: [{
      label: 'Emissionsbelopp (MSEK)',
      data: values
    }]
  })

  return { url, title: `Emissionstrend senaste ${timeframeDays} dagar` }
}

// Generate kungörelse statistics chart
export async function generateKungorelseChart(
  timeframeDays: number = 30
): Promise<{ url: string; title: string } | null> {
  const supabase = createServerClient()

  const startDate = new Date(Date.now() - timeframeDays * 24 * 60 * 60 * 1000)
    .toISOString().split('T')[0]

  const { data } = await supabase
    .from('Kungorelser')
    .select('kategori')
    .gte('publicerad', startDate)

  if (!data || data.length === 0) return null

  // Count by category
  const categoryData: Record<string, number> = {}
  data.forEach(item => {
    const category = item.kategori || 'Övrigt'
    categoryData[category] = (categoryData[category] || 0) + 1
  })

  const labels = Object.keys(categoryData)
  const values = labels.map(l => categoryData[l])

  const url = generateChartUrl({
    type: 'doughnut',
    title: `Kungörelser per kategori - Senaste ${timeframeDays} dagar`,
    labels,
    datasets: [{
      label: 'Antal',
      data: values
    }]
  })

  return { url, title: `Kungörelsefördelning senaste ${timeframeDays} dagar` }
}

// Generate protocol type distribution chart
export async function generateProtocolTypeChart(
  timeframeDays: number = 90
): Promise<{ url: string; title: string } | null> {
  const supabase = createServerClient()

  const startDate = new Date(Date.now() - timeframeDays * 24 * 60 * 60 * 1000)
    .toISOString().split('T')[0]

  const { data } = await supabase
    .from('ProtocolAnalysis')
    .select('protocol_type')
    .gte('protocol_date', startDate)

  if (!data || data.length === 0) return null

  // Count by type
  const typeData: Record<string, number> = {}
  data.forEach(item => {
    const type = item.protocol_type || 'Okänd'
    typeData[type] = (typeData[type] || 0) + 1
  })

  const labels = Object.keys(typeData)
  const values = labels.map(l => typeData[l])

  const url = generateChartUrl({
    type: 'pie',
    title: `Protokolltyper - Senaste ${timeframeDays} dagar`,
    labels,
    datasets: [{
      label: 'Antal',
      data: values
    }]
  })

  return { url, title: `Protokollfördelning senaste ${timeframeDays} dagar` }
}

// Generate company-specific emission history
export async function generateCompanyEmissionChart(
  orgNumber: string
): Promise<{ url: string; title: string } | null> {
  const supabase = createServerClient()

  const cleanOrg = orgNumber.replace(/-/g, '')
  const formattedOrg = cleanOrg.length === 10
    ? `${cleanOrg.slice(0, 6)}-${cleanOrg.slice(6)}`
    : orgNumber

  const { data } = await supabase
    .from('ProtocolAnalysis')
    .select('protocol_date, company_name, extracted_data, calculations')
    .eq('org_number', formattedOrg)
    .order('protocol_date', { ascending: true })

  if (!data || data.length === 0) return null

  const emissions: { date: string; amount: number }[] = []
  let companyName = ''

  data.forEach(item => {
    companyName = item.company_name || companyName
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const extracted = item.extracted_data as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const calcs = item.calculations as any

    const emissionAmount =
      calcs?.emission?.emissionsbelopp_kr ||
      extracted?.kapitalåtgärder?.nyemission?.emissionsbelopp_kr

    if (emissionAmount && emissionAmount > 0) {
      emissions.push({
        date: item.protocol_date,
        amount: emissionAmount
      })
    }
  })

  if (emissions.length === 0) return null

  const url = generateChartUrl({
    type: 'bar',
    title: `${companyName} - Emissionshistorik`,
    labels: emissions.map(e => e.date),
    datasets: [{
      label: 'Emissionsbelopp (kr)',
      data: emissions.map(e => e.amount)
    }]
  })

  return { url, title: `Emissionshistorik för ${companyName}` }
}

// Send chart to Slack
export async function sendChartToSlack(
  channelId: string,
  chartUrl: string,
  title: string
): Promise<boolean> {
  const token = process.env.SLACK_BOT_TOKEN
  if (!token) return false

  try {
    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        channel: channelId,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: `📊 ${title}`
            }
          },
          {
            type: 'image',
            image_url: chartUrl,
            alt_text: title
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `_Genererad av Loop-AI ${new Date().toLocaleString('sv-SE')}_`
              }
            ]
          }
        ],
        text: title
      })
    })

    const result = await response.json()
    return result.ok
  } catch (error) {
    console.error('Error sending chart to Slack:', error)
    return false
  }
}
