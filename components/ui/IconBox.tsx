'use client'

import { forwardRef, HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

export type IconBoxVariant =
  | 'default'
  | 'primary'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'muted'

export interface IconBoxProps extends HTMLAttributes<HTMLDivElement> {
  icon: LucideIcon | ReactNode
  variant?: IconBoxVariant
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
}

const variantStyles: Record<IconBoxVariant, string> = {
  default: `
    bg-gray-100 dark:bg-gray-800
    text-gray-600 dark:text-gray-400
  `,
  primary: `
    bg-blue-100 dark:bg-blue-900/30
    text-blue-600 dark:text-blue-400
  `,
  success: `
    bg-green-100 dark:bg-green-900/30
    text-green-600 dark:text-green-400
  `,
  warning: `
    bg-amber-100 dark:bg-amber-900/30
    text-amber-600 dark:text-amber-400
  `,
  error: `
    bg-red-100 dark:bg-red-900/30
    text-red-600 dark:text-red-400
  `,
  info: `
    bg-sky-100 dark:bg-sky-900/30
    text-sky-600 dark:text-sky-400
  `,
  muted: `
    bg-gray-50 dark:bg-gray-900
    text-gray-400 dark:text-gray-500
  `,
}

const sizeStyles = {
  xs: {
    container: 'w-6 h-6 rounded',
    icon: 'w-3 h-3',
  },
  sm: {
    container: 'w-8 h-8 rounded-md',
    icon: 'w-4 h-4',
  },
  md: {
    container: 'w-10 h-10 rounded-lg',
    icon: 'w-5 h-5',
  },
  lg: {
    container: 'w-12 h-12 rounded-lg',
    icon: 'w-6 h-6',
  },
  xl: {
    container: 'w-16 h-16 rounded-xl',
    icon: 'w-8 h-8',
  },
}

/**
 * Icon container component with background color variants
 *
 * @example
 * <IconBox icon={Bell} variant="primary" size="md" />
 * <IconBox icon={<CustomIcon />} variant="success" />
 */
export const IconBox = forwardRef<HTMLDivElement, IconBoxProps>(
  (
    {
      icon,
      variant = 'default',
      size = 'md',
      className,
      ...props
    },
    ref
  ) => {
    const styles = sizeStyles[size]

    // Check if icon is a Lucide icon component (function)
    const isLucideIcon = typeof icon === 'function'

    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center justify-center shrink-0',
          'transition-colors duration-200',
          variantStyles[variant],
          styles.container,
          className
        )}
        aria-hidden="true"
        {...props}
      >
        {isLucideIcon ? (
          (() => {
            const IconComponent = icon as LucideIcon
            return <IconComponent className={styles.icon} />
          })()
        ) : (
          <span className={cn('flex items-center justify-center', styles.icon)}>
            {icon as ReactNode}
          </span>
        )}
      </div>
    )
  }
)

IconBox.displayName = 'IconBox'

export default IconBox
