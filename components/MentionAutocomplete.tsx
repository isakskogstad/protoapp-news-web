'use client'

import { useEffect, useRef } from 'react'
import { filterUsersForMention } from '@/lib/slack-utils'

interface MentionAutocompleteProps {
  query: string
  users: Record<string, string>
  onSelect: (userId: string, userName: string) => void
  onClose: () => void
  position?: { top: number; left: number }
}

export default function MentionAutocomplete({
  query,
  users,
  onSelect,
  onClose,
}: MentionAutocompleteProps) {
  const ref = useRef<HTMLDivElement>(null)
  const filteredUsers = filterUsersForMention(query, users)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  if (filteredUsers.length === 0) return null

  return (
    <div
      ref={ref}
      className="absolute bottom-full left-0 mb-1 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50 animate-scale-in"
    >
      <div className="px-3 py-2 text-[10px] font-mono text-gray-500 dark:text-gray-400 uppercase border-b border-gray-100 dark:border-gray-700">
        Användare som matchar &quot;{query}&quot;
      </div>
      <ul className="max-h-48 overflow-y-auto">
        {filteredUsers.map((user) => (
          <li key={user.id}>
            <button
              onClick={() => onSelect(user.id, user.name)}
              className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
            >
              <div className="w-6 h-6 rounded bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-[10px] font-bold text-gray-600 dark:text-gray-300">
                {user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </div>
              <span className="text-sm text-gray-900 dark:text-white truncate">{user.name}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
