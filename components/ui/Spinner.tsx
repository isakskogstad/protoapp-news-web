'use client'

import { forwardRef, HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface SpinnerProps extends HTMLAttributes<HTMLDivElement> {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  color?: 'default' | 'primary' | 'white' | 'muted'
  label?: string
}

const sizeStyles = {
  xs: 'w-3 h-3 border',
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-8 h-8 border-2',
  xl: 'w-12 h-12 border-[3px]',
}

const colorStyles = {
  default: 'border-gray-300 border-t-gray-900 dark:border-gray-600 dark:border-t-white',
  primary: 'border-blue-200 border-t-blue-600 dark:border-blue-800 dark:border-t-blue-400',
  white: 'border-white/30 border-t-white',
  muted: 'border-gray-200 border-t-gray-500 dark:border-gray-700 dark:border-t-gray-400',
}

/**
 * Loading spinner component
 *
 * @example
 * <Spinner size="md" />
 * <Spinner size="lg" color="primary" label="Loading data..." />
 */
export const Spinner = forwardRef<HTMLDivElement, SpinnerProps>(
  (
    {
      size = 'md',
      color = 'default',
      label,
      className,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        role="status"
        aria-label={label || 'Loading'}
        className={cn('flex items-center gap-2', className)}
        {...props}
      >
        <div
          className={cn(
            'rounded-full animate-spin',
            sizeStyles[size],
            colorStyles[color]
          )}
          aria-hidden="true"
        />
        {label && (
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {label}
          </span>
        )}
        <span className="sr-only">{label || 'Loading'}</span>
      </div>
    )
  }
)

Spinner.displayName = 'Spinner'

/**
 * Full-page loading spinner
 */
export function PageSpinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center min-h-[200px] w-full">
      <Spinner size="lg" label={label} />
    </div>
  )
}

/**
 * Inline loading spinner for buttons and small areas
 */
export function InlineSpinner({ className }: { className?: string }) {
  return <Spinner size="sm" color="muted" className={className} />
}

export default Spinner
