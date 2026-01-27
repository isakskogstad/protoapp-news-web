import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase'
import { protocolToNewsItem, kungorelseToNewsItem } from '@/lib/utils'
import NewsDetail from '@/components/NewsDetail'
import NewsSidebar from '@/components/NewsSidebar'
import GlobalSidebar from '@/components/GlobalSidebar'

interface NewsPageProps {
  params: { id: string }
}

export async function generateMetadata({ params }: NewsPageProps) {
  const supabase = createServerClient()

  // Try ProtocolAnalysis first
  const { data: protocol } = await supabase
    .from('ProtocolAnalysis')
    .select('company_name, news_content')
    .eq('id', params.id)
    .single()

  if (protocol) {
    return {
      title: `${protocol.company_name} - ${protocol.news_content?.rubrik || 'Nyhetsartikel'} | LoopDesk`,
      description: protocol.news_content?.notistext?.substring(0, 160),
    }
  }

  // Try Kungorelser
  const { data: kungorelse } = await supabase
    .from('Kungorelser')
    .select('company_name, kungorelsetext')
    .eq('id', params.id)
    .single()

  if (kungorelse) {
    return {
      title: `${kungorelse.company_name} - Kungörelse | LoopDesk`,
      description: kungorelse.kungorelsetext?.substring(0, 160),
    }
  }

  return {
    title: 'Nyhetsartikel | LoopDesk',
  }
}

export default async function NewsPage({ params }: NewsPageProps) {
  const supabase = createServerClient()

  // Try ProtocolAnalysis first
  const { data: protocol, error: protocolError } = await supabase
    .from('ProtocolAnalysis')
    .select('*')
    .eq('id', params.id)
    .single()

  if (protocol && !protocolError) {
    const newsItem = protocolToNewsItem(protocol)
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex gap-8">
          {/* Main content */}
          <main className="flex-1 min-w-0">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-gray-500 hover:text-black mb-6 transition-colors text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Tillbaka
            </Link>
            <NewsDetail item={newsItem} />
          </main>

          {/* Global sidebar with chat + news */}
          <GlobalSidebar>
            <NewsSidebar companyName={newsItem.companyName} />
          </GlobalSidebar>
        </div>
      </div>
    )
  }

  // Try Kungorelser
  const { data: kungorelse, error: kungorelseError } = await supabase
    .from('Kungorelser')
    .select('*')
    .eq('id', params.id)
    .single()

  if (kungorelse && !kungorelseError) {
    const newsItem = kungorelseToNewsItem(kungorelse)
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex gap-8">
          {/* Main content */}
          <main className="flex-1 min-w-0">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-gray-500 hover:text-black mb-6 transition-colors text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Tillbaka
            </Link>
            <NewsDetail item={newsItem} />
          </main>

          {/* Global sidebar with chat + news */}
          <GlobalSidebar>
            <NewsSidebar companyName={newsItem.companyName} />
          </GlobalSidebar>
        </div>
      </div>
    )
  }

  notFound()
}
