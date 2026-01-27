'use client'

interface TypingUser {
  userName: string
}

interface TypingIndicatorProps {
  users: TypingUser[]
}

export default function TypingIndicator({ users }: TypingIndicatorProps) {
  if (users.length === 0) return null

  const names = users.map(u => u.userName)
  let text = ''

  if (names.length === 1) {
    text = `${names[0]} skriver`
  } else if (names.length === 2) {
    text = `${names[0]} och ${names[1]} skriver`
  } else {
    text = `${names[0]} och ${names.length - 1} andra skriver`
  }

  return (
    <div className="px-4 py-2 flex items-center gap-2">
      <div className="flex items-center gap-1">
        <span className="typing-dot w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500" />
        <span className="typing-dot w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500" />
        <span className="typing-dot w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500" />
      </div>
      <span className="text-xs text-gray-500 dark:text-gray-400">{text}...</span>
    </div>
  )
}
