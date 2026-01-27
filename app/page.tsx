import { createServerClient } from '@/lib/supabase'
import { protocolToNewsItem, kungorelseToNewsItem } from '@/lib/utils'
import { NewsItem, ProtocolAnalysis, Kungorelse } from '@/lib/types'
import DashboardPage from '@/components/DashboardPage'

export const revalidate = 60

async function getInitialNews(): Promise<NewsItem[]> {
  const supabase = createServerClient()
  const items: NewsItem[] = []

  const { data: protocols } = await supabase
    .from('ProtocolAnalysis')
    .select('*')
    .order('analyzed_at', { ascending: false })
    .limit(20)

  if (protocols) {
    items.push(...protocols.map((p: ProtocolAnalysis) => protocolToNewsItem(p)))
  }

  const { data: kungorelser } = await supabase
    .from('Kungorelser')
    .select('*')
    .order('publicerad', { ascending: false })
    .limit(20)

  if (kungorelser) {
    items.push(...kungorelser.map((k: Kungorelse) => kungorelseToNewsItem(k)))
  }

  items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  return items.slice(0, 30)
}

export default async function HomePage() {
  const initialItems = await getInitialNews()

  return <DashboardPage initialItems={initialItems} />
}
