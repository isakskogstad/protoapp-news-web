'use client'

import { forwardRef, ButtonHTMLAttributes, ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  children: ReactNode
}

const variantStyles = {
  primary: `
    bg-black dark:bg-white
    text-white dark:text-black
    hover:bg-gray-800 dark:hover:bg-gray-200
    focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-black dark:focus-visible:ring-white
    shadow-sm hover:shadow-md
    active:scale-[0.98]
  `,
  secondary: `
    bg-gray-100 dark:bg-gray-800
    text-gray-900 dark:text-gray-100
    hover:bg-gray-200 dark:hover:bg-gray-700
    focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-400
    active:scale-[0.98]
  `,
  outline: `
    border border-gray-300 dark:border-gray-600
    bg-transparent
    text-gray-700 dark:text-gray-300
    hover:bg-gray-50 dark:hover:bg-gray-800
    hover:border-gray-400 dark:hover:border-gray-500
    focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-400
    active:scale-[0.98]
  `,
  ghost: `
    bg-transparent
    text-gray-600 dark:text-gray-400
    hover:bg-gray-100 dark:hover:bg-gray-800
    hover:text-gray-900 dark:hover:text-gray-100
    focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gray-400
    active:scale-[0.98]
  `,
  danger: `
    bg-red-600 dark:bg-red-500
    text-white
    hover:bg-red-700 dark:hover:bg-red-600
    focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-500
    shadow-sm hover:shadow-md
    active:scale-[0.98]
  `,
}

const sizeStyles = {
  sm: 'px-3 py-1.5 text-sm rounded-md gap-1.5',
  md: 'px-4 py-2 text-sm rounded-lg gap-2',
  lg: 'px-6 py-3 text-base rounded-lg gap-2',
}

const iconSizes = {
  sm: 'w-3.5 h-3.5',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
}

/**
 * Reusable Button component with variants, sizes, and loading state
 *
 * @example
 * <Button variant="primary" size="md">Click me</Button>
 * <Button variant="outline" isLoading>Submitting...</Button>
 * <Button leftIcon={<Plus />}>Add item</Button>
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={cn(
          // Base styles
          'inline-flex items-center justify-center font-medium',
          'transition-all duration-200 ease-out',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
          // Variant styles
          variantStyles[variant],
          // Size styles
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {isLoading ? (
          <Loader2 className={cn('animate-spin', iconSizes[size])} aria-hidden="true" />
        ) : (
          leftIcon && <span className={iconSizes[size]} aria-hidden="true">{leftIcon}</span>
        )}
        <span>{children}</span>
        {!isLoading && rightIcon && (
          <span className={iconSizes[size]} aria-hidden="true">{rightIcon}</span>
        )}
      </button>
    )
  }
)

Button.displayName = 'Button'

export default Button
