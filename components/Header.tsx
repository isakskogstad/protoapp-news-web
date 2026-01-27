'use client'

import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import Image from 'next/image'
import { useState, useEffect } from 'react'

export default function Header() {
  const { data: session } = useSession()
  const [darkMode, setDarkMode] = useState(false)

  // Load dark mode preference
  useEffect(() => {
    const stored = localStorage.getItem('loopdesk_darkmode')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches

    if (stored === 'true' || (!stored && prefersDark)) {
      setDarkMode(true)
      document.documentElement.classList.add('dark')
    }
  }, [])

  // Toggle dark mode
  const toggleDarkMode = () => {
    setDarkMode(prev => {
      const next = !prev
      localStorage.setItem('loopdesk_darkmode', String(next))
      if (next) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
      return next
    })
  }

  return (
    <header className="bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm border-b border-gray-100 dark:border-gray-800 sticky top-0 z-50 transition-colors">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-semibold text-gray-900 dark:text-white tracking-tight text-lg">
          LoopDesk
        </Link>

        <div className="flex items-center gap-4">
          {/* Live indicator */}
          <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse-subtle" />
            Live
          </div>

          {/* Dark mode toggle */}
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label={darkMode ? 'Ljust läge' : 'Mörkt läge'}
          >
            {darkMode ? (
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>

          {/* User */}
          {session?.user && (
            <div className="flex items-center gap-2">
              {session.user.image && (
                <Image
                  src={session.user.image}
                  alt=""
                  width={24}
                  height={24}
                  className="rounded-full"
                />
              )}
              <button
                onClick={() => signOut()}
                className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                Logga ut
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
