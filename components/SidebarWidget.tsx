'use client'

import { ArrowRight } from 'lucide-react'

interface SidebarWidgetProps {
  title: string
  icon?: React.ReactNode
  children: React.ReactNode
  actionLabel?: string
  onAction?: () => void
  className?: string
  collapsed?: boolean
}

export default function SidebarWidget({
  title,
  icon,
  children,
  actionLabel,
  onAction,
  className = "",
  collapsed = false
}: SidebarWidgetProps) {
  return (
    <div className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm ${className}`}>
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50">
        <div className="flex items-center gap-2">
          {icon && <span className="text-gray-400 dark:text-gray-500">{icon}</span>}
          <h4 className="font-bold text-sm text-black dark:text-white">{title}</h4>
        </div>
        {actionLabel && (
          <button
            onClick={onAction}
            className="text-[10px] font-mono text-gray-400 dark:text-gray-500 hover:text-black dark:hover:text-white uppercase tracking-wider transition-colors flex items-center gap-1"
          >
            {actionLabel} <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>
      {!collapsed && (
        <div className="p-0">
          {children}
        </div>
      )}
    </div>
  )
}
