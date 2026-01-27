'use client'

type SSEStatus = 'connected' | 'connecting' | 'disconnected' | 'error'

interface SSEStatusIndicatorProps {
  status: SSEStatus
  className?: string
}

const statusConfig: Record<SSEStatus, { color: string; pulseColor: string; label: string; tooltip: string }> = {
  connected: {
    color: 'bg-green-500',
    pulseColor: '',
    label: 'Ansluten',
    tooltip: 'Realtidsuppdateringar aktiva'
  },
  connecting: {
    color: 'bg-orange-500',
    pulseColor: 'animate-pulse',
    label: 'Ansluter...',
    tooltip: 'Försöker ansluta till servern'
  },
  disconnected: {
    color: 'bg-gray-400 dark:bg-gray-500',
    pulseColor: '',
    label: 'Frånkopplad',
    tooltip: 'Ingen anslutning - försöker återansluta'
  },
  error: {
    color: 'bg-red-500',
    pulseColor: '',
    label: 'Fel',
    tooltip: 'Anslutningsfel - försöker igen'
  }
}

export default function SSEStatusIndicator({ status, className = '' }: SSEStatusIndicatorProps) {
  const config = statusConfig[status]

  return (
    <div
      className={`group relative inline-flex items-center gap-1.5 ${className}`}
      title={config.tooltip}
    >
      {/* Status dot */}
      <span
        className={`
          w-2 h-2 rounded-full
          ${config.color}
          ${config.pulseColor}
        `}
      />

      {/* Status label */}
      <span className="text-xs text-gray-400 dark:text-gray-500">
        {config.label}
      </span>

      {/* Tooltip on hover */}
      <div className="
        absolute left-1/2 -translate-x-1/2 bottom-full mb-2
        px-2 py-1 rounded bg-gray-900 dark:bg-gray-700 text-white text-xs whitespace-nowrap
        opacity-0 group-hover:opacity-100 transition-opacity duration-200
        pointer-events-none z-10
      ">
        {config.tooltip}
        {/* Tooltip arrow */}
        <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700" />
      </div>
    </div>
  )
}
