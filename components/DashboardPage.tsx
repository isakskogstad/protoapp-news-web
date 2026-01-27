'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import {
  Bell, Search, Settings,
  Clock, ArrowUpRight, Globe, FileText,
  Calendar, TrendingUp, Eye, Activity, MessageSquare, Plus, TrendingDown, Minus
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

// Sidebar Widget
interface SidebarWidgetProps {
  title: string
  icon?: React.ReactNode
  children: React.ReactNode
  actionLabel?: string
  className?: string
}

function SidebarWidget({ title, icon, children, actionLabel, className = "" }: SidebarWidgetProps) {
  return (
    <div className={`bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm ${className}`}>
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
        <div className="flex items-center gap-2">
          {icon && <span className="text-gray-400">{icon}</span>}
          <h4 className="font-bold text-lg text-black">{title}</h4>
        </div>
        {actionLabel && (
          <button className="text-[10px] font-mono text-gray-400 hover:text-black uppercase tracking-wider transition-colors flex items-center gap-1">
            {actionLabel} <ArrowUpRight className="w-3 h-3" />
          </button>
        )}
      </div>
      <div className="p-0">
        {children}
      </div>
    </div>
  )
}

// Mock data for widgets
const MOCK_COMPANIES = [
  { id: '1', name: "Spotify", ticker: "SPOT", change: "+2.4%", status: "up" as const },
  { id: '2', name: "Embracer", ticker: "EMBRAC", change: "-1.2%", status: "down" as const },
  { id: '3', name: "Kinnevik", ticker: "KINV B", change: "+0.8%", status: "up" as const },
  { id: '4', name: "Volvo Car", ticker: "VOLCAR B", change: "-0.5%", status: "down" as const },
]

const MOCK_EVENTS = [
  { title: "Kvartalsrapport Q1", company: "Volvo Cars", date: "Imorgon 08:30" },
  { title: "Tech Sthlm Meetup", company: "Sup46", date: "Tor 17:00" },
  { title: "Årsstämma", company: "Ericsson", date: "Fre 13:00" }
]

// Follow Companies Widget
interface Company {
  id: string
  name: string
  ticker: string
  change: string
  status: 'up' | 'down' | 'neutral'
}

function FollowCompanies({ companies }: { companies: Company[] }) {
  return (
    <div className="flex flex-col">
      {companies.map((company, index) => (
        <div
          key={company.id}
          className={`
            flex items-center justify-between p-3 hover:bg-gray-50 transition-colors cursor-pointer group
            ${index !== companies.length - 1 ? 'border-b border-gray-50' : ''}
          `}
        >
          <div className="flex flex-col">
            <span className="font-bold text-sm text-black group-hover:text-blue-700 transition-colors">
              {company.name}
            </span>
            <span className="text-[10px] font-mono text-gray-400">{company.ticker}</span>
          </div>

          <span className={`
            text-xs font-mono font-medium px-2 py-1 rounded-md flex items-center gap-1.5
            ${company.status === 'up' ? 'bg-green-50 text-green-700' :
              company.status === 'down' ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-600'}
          `}>
            {company.status === 'up' && <TrendingUp className="w-3 h-3" />}
            {company.status === 'down' && <TrendingDown className="w-3 h-3" />}
            {company.status === 'neutral' && <Minus className="w-3 h-3" />}
            {company.change}
          </span>
        </div>
      ))}

      <button className="w-full py-3 text-xs font-mono font-medium text-gray-400 hover:text-black hover:bg-gray-50 transition-colors border-t border-gray-100 flex items-center justify-center gap-2 mt-1">
        <Eye className="w-3 h-3" />
        LÄGG TILL BOLAG
      </button>
    </div>
  )
}

// Calendar Widget
interface Event {
  title: string
  company: string
  date: string
}

function CalendarWidget({ events }: { events: Event[] }) {
  return (
    <div className="flex flex-col">
      {events.map((event, i) => (
        <div key={i} className="flex gap-3 p-3 hover:bg-gray-50 transition-colors cursor-pointer group relative border-b border-gray-50 last:border-0">

          <div className="w-10 h-10 bg-gray-100 rounded-lg flex flex-col items-center justify-center text-gray-500 shrink-0 border border-gray-200 group-hover:border-black/10 group-hover:bg-white transition-colors">
            <span className="text-[9px] font-bold uppercase">JAN</span>
            <span className="text-xs font-mono font-bold leading-none text-black">{27 + i}</span>
          </div>

          <div className="flex flex-col justify-center min-w-0">
            <span className="text-xs font-bold text-black truncate group-hover:text-blue-700 transition-colors">
              {event.title}
            </span>
            <span className="text-[10px] font-mono text-gray-500 truncate">
              {event.company} • {event.date}
            </span>
          </div>

          <button className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-white border border-gray-200 text-gray-400 opacity-0 group-hover:opacity-100 hover:text-black hover:border-black transition-all shadow-sm">
            <Plus className="w-3 h-3" />
          </button>
        </div>
      ))}
    </div>
  )
}

// Impact Loop Section
function ImpactLoopSection() {
  const articles = [
    { id: 1, title: "Så ställer industrin om för netto-noll 2030", tag: "RAPPORT" },
    { id: 2, title: "Hållbarhetschefernas största utmaningar just nu", tag: "ANALYS" },
    { id: 3, title: "Nya EU-direktivet som skakar om leverantörskedjorna", tag: "INTERVJU" },
  ]

  return (
    <div className="bg-black text-white rounded-2xl p-8 overflow-hidden relative shadow-xl">
      <div className="absolute top-0 right-0 w-96 h-96 bg-green-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />

      <div className="relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-6 border-b border-white/10 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-2 text-green-400">
                <TrendingUp className="w-4 h-4" />
                <span className="text-[10px] font-mono tracking-widest uppercase">PREMIUM INSIKTER</span>
            </div>
            <h2 className="text-4xl md:text-5xl tracking-tight leading-none font-bold">IMPACT LOOP</h2>
          </div>
          <Link href="/impactloop" className="text-xs font-mono font-bold border border-white/20 px-5 py-2.5 rounded-full hover:bg-white hover:text-black transition-colors flex items-center gap-2 group bg-white/5 backdrop-blur-sm">
            TILL TJÄNSTEN <ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {articles.map((article) => (
            <div
              key={article.id}
              className="group p-5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer flex flex-col justify-between h-full"
            >
              <div>
                <span className="text-[9px] font-mono text-white/40 mb-3 block border border-white/10 w-fit px-2 py-0.5 rounded">{article.tag}</span>
                <h3 className="text-xl text-white/90 group-hover:text-white leading-tight mb-4 font-bold">
                    {article.title}
                </h3>
              </div>
              <span className="text-[10px] font-mono text-white/30 group-hover:text-white/60 transition-colors flex items-center gap-1">
                LÄS NU <ArrowUpRight className="w-2 h-2" />
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Main Dashboard Page
export default function DashboardPage({ initialItems }: DashboardPageProps) {
  const [filter, setFilter] = useState<'all' | 'following'>('all')

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-[#1A1A1A] pb-20">

      <DashboardHeader />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* Main Content */}
          <div className="lg:col-span-8 space-y-8">
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
                    MINA BOLAG
                  </button>
                </div>
              </div>

              <div className="flex flex-col">
                {initialItems.slice(0, 10).map((item, index) => (
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

            <section className="pt-4">
               <ImpactLoopSection />
            </section>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            <SidebarWidget title="Redaktionen" icon={<MessageSquare className="w-4 h-4" />}>
              <div className="p-4 text-center text-sm text-gray-500">
                <p>Chatten finns i nedre högra hörnet</p>
              </div>
            </SidebarWidget>

            <SidebarWidget title="Mina Bolag" icon={<Eye className="w-4 h-4" />} actionLabel="Ändra">
               <FollowCompanies companies={MOCK_COMPANIES} />
            </SidebarWidget>

            <SidebarWidget title="Kalender" icon={<Calendar className="w-4 h-4" />}>
               <CalendarWidget events={MOCK_EVENTS} />
            </SidebarWidget>

            <div className="bg-black rounded-xl p-6 text-white overflow-hidden relative group cursor-pointer shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
              <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-30 transition-opacity">
                <TrendingUp className="w-24 h-24" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-[10px] font-mono tracking-widest uppercase text-gray-400">Analys</span>
                </div>
                <h4 className="text-2xl mb-2 text-white font-bold">Marknadsläget Q1</h4>
                <p className="text-sm text-gray-400 mb-6 line-clamp-2">Djupdykning i räntebeskedet och vad det betyder för tech-sektorn.</p>
                <span className="inline-block text-[10px] font-mono font-bold border border-white/20 px-4 py-2 rounded-full group-hover:bg-white group-hover:text-black transition-all">
                  LÄS MER
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
