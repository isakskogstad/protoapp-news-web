'use client'

import { useState, useEffect } from 'react'
import { ArrowRight, ChevronDown, ChevronRight } from 'lucide-react'

interface SidebarWidgetProps {
  title: string
  icon?: React.ReactNode
  children: React.ReactNode
  actionLabel?: string
  onAction?: () => void
  className?: string
  /** Number of items in the widget - used to determine default collapsed state */
  itemCount?: number
  /** Force collapsed state (overrides itemCount logic) */
  forceCollapsed?: boolean
  /** Whether the widget is collapsible */
  collapsible?: boolean
}

export default function SidebarWidget({
  title,
  icon,
  children,
  actionLabel,
  onAction,
  className = "",
  itemCount = 0,
  forceCollapsed,
  collapsible = true
}: SidebarWidgetProps) {
  // Default collapsed state:
  // - If not collapsible, always expanded (never collapsed)
  // - If forceCollapsed is set, use that
  // - Otherwise: collapsed if no items, expanded if has items
  const getDefaultCollapsed = () => {
    if (!collapsible) return false // Non-collapsible widgets are always expanded
    if (forceCollapsed !== undefined) return forceCollapsed
    return itemCount === 0
  }
  const [isCollapsed, setIsCollapsed] = useState(getDefaultCollapsed)

  // Update collapsed state when itemCount changes (e.g., data loads)
  useEffect(() => {
    if (!collapsible) {
      setIsCollapsed(false) // Non-collapsible widgets stay expanded
    } else if (forceCollapsed === undefined) {
      setIsCollapsed(itemCount === 0)
    }
  }, [itemCount, forceCollapsed, collapsible])

  const handleHeaderClick = () => {
    if (collapsible) {
      setIsCollapsed(!isCollapsed)
    }
  }

  return (
    <div className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm ${className}`}>
      {/* Header - clickable for toggle */}
      <div
        onClick={handleHeaderClick}
        className={`px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50 ${
          collapsible ? 'cursor-pointer hover:bg-gray-100/50 dark:hover:bg-gray-700/50 transition-colors' : ''
        }`}
      >
        <div className="flex items-center gap-2">
          {collapsible && (
            <span className="text-gray-400 dark:text-gray-500 transition-transform">
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </span>
          )}
          {icon && <span className="text-gray-400 dark:text-gray-500">{icon}</span>}
          <h4 className="font-bold text-sm text-black dark:text-white">{title}</h4>
          {/* Item count badge when collapsed */}
          {isCollapsed && itemCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-[10px] font-mono font-medium bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
              {itemCount}
            </span>
          )}
        </div>
        {actionLabel && !isCollapsed && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onAction?.()
            }}
            className="text-[10px] font-mono text-gray-400 dark:text-gray-500 hover:text-black dark:hover:text-white uppercase tracking-wider transition-colors flex items-center gap-1"
          >
            {actionLabel} <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Content - with smooth collapse animation */}
      <div
        className={`transition-all duration-200 ease-in-out overflow-hidden ${
          isCollapsed ? 'max-h-0' : 'max-h-[500px]'
        }`}
      >
        <div className="p-0">
          {children}
        </div>
      </div>
    </div>
  )
}
