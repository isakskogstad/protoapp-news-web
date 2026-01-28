'use client'

import { forwardRef, HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type BadgeVariant =
  | 'default'
  | 'primary'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'konkurs'
  | 'nyemission'
  | 'styrelse'
  | 'vdbyte'
  | 'rekonstruktion'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  size?: 'sm' | 'md' | 'lg'
  dot?: boolean
  children: ReactNode
}

const variantStyles: Record<BadgeVariant, string> = {
  default: `
    bg-gray-100 dark:bg-gray-800
    text-gray-700 dark:text-gray-300
    border border-gray-200 dark:border-gray-700
  `,
  primary: `
    bg-blue-50 dark:bg-blue-900/30
    text-blue-700 dark:text-blue-300
    border border-blue-200 dark:border-blue-800
  `,
  success: `
    bg-green-50 dark:bg-green-900/30
    text-green-700 dark:text-green-300
    border border-green-200 dark:border-green-800
  `,
  warning: `
    bg-amber-50 dark:bg-amber-900/30
    text-amber-700 dark:text-amber-300
    border border-amber-200 dark:border-amber-800
  `,
  error: `
    bg-red-50 dark:bg-red-900/30
    text-red-700 dark:text-red-300
    border border-red-200 dark:border-red-800
  `,
  info: `
    bg-sky-50 dark:bg-sky-900/30
    text-sky-700 dark:text-sky-300
    border border-sky-200 dark:border-sky-800
  `,
  // Protocol type badges
  konkurs: `
    bg-red-50 dark:bg-red-900/30
    text-red-700 dark:text-red-300
    border border-red-200 dark:border-red-800
  `,
  nyemission: `
    bg-emerald-50 dark:bg-emerald-900/30
    text-emerald-700 dark:text-emerald-300
    border border-emerald-200 dark:border-emerald-800
  `,
  styrelse: `
    bg-purple-50 dark:bg-purple-900/30
    text-purple-700 dark:text-purple-300
    border border-purple-200 dark:border-purple-800
  `,
  vdbyte: `
    bg-orange-50 dark:bg-orange-900/30
    text-orange-700 dark:text-orange-300
    border border-orange-200 dark:border-orange-800
  `,
  rekonstruktion: `
    bg-yellow-50 dark:bg-yellow-900/30
    text-yellow-700 dark:text-yellow-300
    border border-yellow-200 dark:border-yellow-800
  `,
}

const dotColors: Record<BadgeVariant, string> = {
  default: 'bg-gray-500',
  primary: 'bg-blue-500',
  success: 'bg-green-500',
  warning: 'bg-amber-500',
  error: 'bg-red-500',
  info: 'bg-sky-500',
  konkurs: 'bg-red-500',
  nyemission: 'bg-emerald-500',
  styrelse: 'bg-purple-500',
  vdbyte: 'bg-orange-500',
  rekonstruktion: 'bg-yellow-500',
}

const sizeStyles = {
  sm: 'px-1.5 py-0.5 text-xs',
  md: 'px-2 py-0.5 text-xs',
  lg: 'px-2.5 py-1 text-sm',
}

const dotSizes = {
  sm: 'w-1.5 h-1.5',
  md: 'w-2 h-2',
  lg: 'w-2.5 h-2.5',
}

/**
 * Badge component for labels, tags, and status indicators
 *
 * @example
 * <Badge variant="success">Active</Badge>
 * <Badge variant="konkurs" dot>Konkurs</Badge>
 * <Badge variant="primary" size="lg">New</Badge>
 */
export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      variant = 'default',
      size = 'md',
      dot = false,
      children,
      className,
      ...props
    },
    ref
  ) => {
    return (
      <span
        ref={ref}
        className={cn(
          // Base styles
          'inline-flex items-center gap-1.5 font-medium rounded-full',
          'whitespace-nowrap select-none',
          // Variant styles
          variantStyles[variant],
          // Size styles
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {dot && (
          <span
            className={cn('rounded-full', dotColors[variant], dotSizes[size])}
            aria-hidden="true"
          />
        )}
        {children}
      </span>
    )
  }
)

Badge.displayName = 'Badge'

/**
 * Helper function to get badge variant from protocol type
 */
export function getProtocolBadgeVariant(protocolType: string): BadgeVariant {
  const type = protocolType.toLowerCase()
  if (type.includes('konkurs')) return 'konkurs'
  if (type.includes('emission') || type.includes('nyemission')) return 'nyemission'
  if (type.includes('styrelse')) return 'styrelse'
  if (type.includes('vd') || type.includes('byte')) return 'vdbyte'
  if (type.includes('rekonstruktion')) return 'rekonstruktion'
  return 'default'
}

export default Badge
