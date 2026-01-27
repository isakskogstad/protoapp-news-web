'use client'

import Link from 'next/link'
import { useState } from 'react'
import {
  Bell, Search, Settings,
  Clock, ArrowUpRight, Globe, FileText, Activity
} from 'lucide-react'
import { NewsItem } from '@/lib/types'
import { formatRelativeTime } from '@/lib/utils'
import { useSession } from 'next-auth/react'

interface DashboardPageProps {
  initialItems: NewsItem[]
}

// Dashboard Header
function DashboardHeader() {
  const { data: session } = useSession()
  const userName = session?.user?.name || 'Användare'
  const initials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">

        {/* Left: Logo */}
        <div className="flex items-center gap-8">
          <Link href="/" className="group flex items-center gap-2.5">
            <div className="w-8 h-8 bg-black text-white rounded-lg flex items-center justify-center font-bold text-lg transition-transform group-hover:scale-105">
              L
            </div>
            <span className="text-xl tracking-tight text-black">
              LOOP<span className="text-gray-400">DESK</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-2 text-sm font-mono text-gray-500">
            <span className="text-gray-300">/</span>
            <span className="text-black font-medium">ÖVERSIKT</span>
          </div>
        </div>

        {/* Center: Search */}
        <div className="hidden md:block flex-1 max-w-md mx-8">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-black transition-colors" />
            <input
              type="text"
              placeholder="Sök bolag, person eller nyckelord..."
              className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black transition-all placeholder:text-gray-400 text-black"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden lg:flex items-center gap-1">
              <span className="text-[10px] font-mono text-gray-400 border border-gray-200 rounded px-1.5 py-0.5">⌘K</span>
            </div>
          </div>
        </div>

        {/* Right: Profile & Notifications */}
        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-gray-100 rounded-md transition-colors text-gray-500 hover:text-black relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
          </button>

          <button className="p-2 hover:bg-gray-100 rounded-md transition-colors text-gray-500 hover:text-black hidden sm:block">
            <Settings className="w-5 h-5" />
          </button>

          <div className="h-6 w-px bg-gray-200 mx-2 hidden sm:block" />

          <button className="flex items-center gap-2 pl-2 pr-1 py-1 hover:bg-gray-50 rounded-full transition-all border border-transparent hover:border-gray-200 group">
            <div className="text-right hidden sm:block group-hover:opacity-80">
              <div className="text-xs font-bold leading-none text-black">{userName.split(' ')[0]}</div>
              <div className="text-[10px] font-mono text-gray-500 leading-none mt-0.5">REDAKTÖR</div>
            </div>
            <div className="w-8 h-8 bg-black text-white rounded-full flex items-center justify-center text-sm">
              {initials}
            </div>
          </button>
        </div>
      </div>
    </header>
  )
}

// News Item Component
interface NewsItemCardProps {
  item: NewsItem
  priority?: boolean
}

function NewsItemCard({ item, priority = false }: NewsItemCardProps) {
  const categoryColors: Record<string, string> = {
    'Nyemission': 'bg-green-100 text-green-700',
    'Konkurs': 'bg-red-100 text-red-700',
    'Kallelse': 'bg-blue-100 text-blue-700',
    'Styrelseändring': 'bg-purple-100 text-purple-700',
  }

  const category = item.headline?.split(':')[0] || 'Nyhet'
  const categoryClass = categoryColors[category] || 'bg-gray-100 text-gray-600'

  return (
    <Link href={`/news/${item.id}`} className="block group">
      <article className={`
        relative bg-white border-b border-gray-100 hover:bg-gray-50/80 transition-colors duration-200
        ${priority ? 'py-8' : 'py-6'}
      `}>
        <div className="flex flex-col gap-4">

          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex items-center gap-3 mb-2.5 overflow-hidden">
              <span className={`
                inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium tracking-wide uppercase whitespace-nowrap
                ${priority ? 'bg-black text-white' : categoryClass}
              `}>
                {category}
              </span>
              <div className="flex items-center gap-3 text-xs font-mono text-gray-400 whitespace-nowrap">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatRelativeTime(item.timestamp)}</span>
                <span className="w-px h-3 bg-gray-200" />
                <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> {item.companyName}</span>
              </div>
            </div>

            <h3 className={`
              font-bold text-black leading-tight mb-2 group-hover:text-blue-700 transition-colors
              ${priority ? 'text-2xl md:text-3xl' : 'text-lg md:text-xl'}
            `}>
              {item.headline || `${item.companyName} - ${item.protocolType || 'Händelse'}`}
            </h3>

            {item.noticeText && (
              <p className={`
                text-gray-600 leading-relaxed max-w-3xl
                ${priority ? 'text-base line-clamp-3' : 'text-sm line-clamp-2'}
              `}>
                {item.noticeText}
              </p>
            )}

            <div className="mt-3 flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <span className="text-xs font-mono font-medium text-black hover:underline flex items-center gap-1">
                LÄS MER <ArrowUpRight className="w-3 h-3" />
              </span>
              <button
                className="text-xs font-mono font-medium text-gray-400 hover:text-black flex items-center gap-1 transition-colors"
                onClick={(e) => { e.preventDefault(); }}
              >
                SPARA <FileText className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </article>
    </Link>
  )
}

// Main Dashboard Page
export default function DashboardPage({ initialItems }: DashboardPageProps) {
  const [filter, setFilter] = useState<'all' | 'following'>('all')

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-[#1A1A1A] pb-20">

      <DashboardHeader />

      <main className="max-w-4xl mx-auto px-4 py-8">
        <section>
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
            <h2 className="text-3xl font-bold flex items-center gap-3">
              <div className="w-2.5 h-2.5 bg-red-600 rounded-full animate-pulse shadow-[0_0_8px_rgba(220,38,38,0.5)]" />
              Live Feed
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-1.5 text-xs font-mono font-medium rounded-lg shadow-sm transition-all ${
                  filter === 'all'
                    ? 'border border-black bg-black text-white'
                    : 'border border-gray-200 text-gray-500 bg-white hover:border-black hover:text-black'
                }`}
              >
                ALLA
              </button>
              <button
                onClick={() => setFilter('following')}
                className={`px-4 py-1.5 text-xs font-mono font-medium rounded-lg transition-all ${
                  filter === 'following'
                    ? 'border border-black bg-black text-white'
                    : 'border border-gray-200 text-gray-500 bg-white hover:border-black hover:text-black'
                }`}
              >
                BEVAKADE
              </button>
            </div>
          </div>

          <div className="flex flex-col">
            {initialItems.slice(0, 20).map((item, index) => (
              <NewsItemCard
                key={item.id}
                item={item}
                priority={index === 0}
              />
            ))}
          </div>

          <button className="w-full py-6 text-sm font-mono font-medium text-gray-400 hover:text-black border-t border-gray-100 mt-4 transition-colors flex items-center justify-center gap-2 group">
            LADDA FLER NYHETER
            <Activity className="w-4 h-4 group-hover:animate-bounce" />
          </button>
        </section>
      </main>
    </div>
  )
}
