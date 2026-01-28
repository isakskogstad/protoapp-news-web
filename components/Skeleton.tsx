'use client'

interface SkeletonProps {
  className?: string
  variant?: 'rectangular' | 'circular' | 'text'
  width?: string | number
  height?: string | number
  animation?: 'pulse' | 'shimmer' | 'none'
}

export default function Skeleton({
  className = '',
  variant = 'rectangular',
  width,
  height,
  animation = 'shimmer',
}: SkeletonProps) {
  const baseClasses = 'bg-gray-200 dark:bg-gray-700'

  const variantClasses = {
    rectangular: 'rounded-lg',
    circular: 'rounded-full',
    text: 'rounded',
  }

  const animationClasses = {
    pulse: 'animate-pulse',
    shimmer: 'skeleton-shimmer',
    none: '',
  }

  const style: React.CSSProperties = {}
  if (width) style.width = typeof width === 'number' ? `${width}px` : width
  if (height) style.height = typeof height === 'number' ? `${height}px` : height

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${animationClasses[animation]} ${className}`}
      style={style}
    />
  )
}

// Image skeleton with aspect ratio preservation
interface ImageSkeletonProps {
  width: number
  height: number
  className?: string
}

export function ImageSkeleton({ width, height, className = '' }: ImageSkeletonProps) {
  return (
    <div
      className={`relative overflow-hidden bg-gray-200 dark:bg-gray-700 skeleton-shimmer ${className}`}
      style={{ width, height }}
    >
      {/* Placeholder icon */}
      <div className="absolute inset-0 flex items-center justify-center">
        <svg className="w-6 h-6 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    </div>
  )
}

// Card skeleton for loading news items - responsive for mobile
export function NewsCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4 md:p-5">
      {/* Mobile: Stack vertically, Desktop: Side by side */}
      <div className="flex flex-col md:flex-row gap-3 md:gap-5">
        {/* Company info row (mobile) / column (desktop) */}
        <div className="flex md:flex-col items-center md:items-center gap-3 md:gap-0 md:w-20 flex-shrink-0">
          <Skeleton variant="rectangular" width={48} height={48} className="rounded-xl md:w-14 md:h-14 md:mb-2 flex-shrink-0" />
          <div className="flex flex-col md:items-center min-w-0 flex-1 md:flex-initial">
            <Skeleton variant="text" width={80} height={12} className="mb-1" />
            <Skeleton variant="text" width={60} height={10} />
          </div>
          {/* Badge on mobile */}
          <div className="md:hidden ml-auto">
            <Skeleton variant="rectangular" width={70} height={18} className="rounded-full" />
          </div>
        </div>

        {/* Main content skeleton */}
        <div className="flex-1 min-w-0">
          {/* Badge and time - hidden on mobile */}
          <div className="hidden md:flex items-center gap-2 mb-2">
            <Skeleton variant="rectangular" width={70} height={18} className="rounded-full" />
            <Skeleton variant="text" width={60} height={14} />
          </div>

          {/* Time on mobile */}
          <Skeleton variant="text" width={60} height={14} className="md:hidden mb-1.5" />

          {/* Headline */}
          <Skeleton variant="text" width="90%" height={20} className="mb-2" />

          {/* Notice text */}
          <div className="space-y-1.5">
            <Skeleton variant="text" width="100%" height={14} />
            <Skeleton variant="text" width="95%" height={14} />
            <Skeleton variant="text" width="70%" height={14} />
            <Skeleton variant="text" width="85%" height={14} className="md:hidden" />
          </div>
        </div>
      </div>
    </div>
  )
}
