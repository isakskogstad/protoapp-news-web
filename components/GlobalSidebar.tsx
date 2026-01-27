'use client'

import { MessageSquare } from 'lucide-react'
import SidebarWidget from './SidebarWidget'
import InlineEditorialChat from './InlineEditorialChat'

interface GlobalSidebarProps {
  children?: React.ReactNode
}

export default function GlobalSidebar({ children }: GlobalSidebarProps) {
  return (
    <aside className="hidden lg:block w-96 shrink-0">
      <div className="sticky top-24 space-y-6">
        {/* Editorial Chat - always visible */}
        <SidebarWidget
          title="Redaktionschatten"
          icon={<MessageSquare className="w-4 h-4" />}
        >
          <div className="p-4">
            <InlineEditorialChat maxHeight={350} />
          </div>
        </SidebarWidget>

        {/* Additional content (news sidebar, etc) */}
        {children}
      </div>
    </aside>
  )
}
