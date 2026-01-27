'use client'

import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import Image from 'next/image'

export default function Header() {
  const { data: session } = useSession()

  return (
    <header className="bg-white/80 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-semibold text-gray-900 tracking-tight">
          LoopDesk
        </Link>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse-subtle" />
            Live
          </div>

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
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
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
