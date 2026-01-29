'use client'

import InlineEditorialChat from './InlineEditorialChat'

interface GlobalSidebarProps {
  children?: React.ReactNode
}

export default function GlobalSidebar({ children }: GlobalSidebarProps) {
  return (
    <aside className="hidden lg:block w-[345px] shrink-0 ml-2">
      <div className="sticky top-20 h-[calc(100vh-6rem)]">
        {/* Editorial Chat - full height with minimal header */}
        <div className="h-full bg-white dark:bg-[#161b22] rounded-xl border border-gray-200/60 dark:border-[#30363d] overflow-hidden flex flex-col">
          {/* Minimal header */}
          <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800">
            <span className="text-[10px] font-mono font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Redaktionschat
            </span>
          </div>
          {/* Chat content */}
          <div className="flex-1 min-h-0 px-3 py-2">
            <InlineEditorialChat maxHeight="100%" />
          </div>
        </div>

        {/* Additional content (news sidebar, etc) */}
        {children}
      </div>
    </aside>
  )
}
