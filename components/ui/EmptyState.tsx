'use client'

import { forwardRef, HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { LucideIcon, Inbox, Search, FileX, AlertCircle } from 'lucide-react'
import { Button } from './Button'

export interface EmptyStateProps extends HTMLAttributes<HTMLDivElement> {
  icon?: LucideIcon
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
    variant?: 'primary' | 'secondary' | 'outline'
  }
  secondaryAction?: {
    label: string
    onClick: () => void
  }
  size?: 'sm' | 'md' | 'lg'
  children?: ReactNode
}

const sizeStyles = {
  sm: {
    container: 'py-6 px-4',
    icon: 'w-10 h-10',
    iconBg: 'w-16 h-16',
    title: 'text-sm',
    description: 'text-xs',
  },
  md: {
    container: 'py-10 px-6',
    icon: 'w-12 h-12',
    iconBg: 'w-20 h-20',
    title: 'text-base',
    description: 'text-sm',
  },
  lg: {
    container: 'py-16 px-8',
    icon: 'w-16 h-16',
    iconBg: 'w-28 h-28',
    title: 'text-lg',
    description: 'text-base',
  },
}

/**
 * Empty state component for when there's no content to display
 *
 * @example
 * <EmptyState
 *   icon={Inbox}
 *   title="No messages"
 *   description="You don't have any messages yet"
 *   action={{ label: "Compose", onClick: () => {} }}
 * />
 */
export const EmptyState = forwardRef<HTMLDivElement, EmptyStateProps>(
  (
    {
      icon: Icon = Inbox,
      title,
      description,
      action,
      secondaryAction,
      size = 'md',
      children,
      className,
      ...props
    },
    ref
  ) => {
    const styles = sizeStyles[size]

    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col items-center justify-center text-center',
          styles.container,
          className
        )}
        {...props}
      >
        {/* Icon */}
        <div
          className={cn(
            'flex items-center justify-center rounded-full mb-4',
            'bg-gray-100 dark:bg-gray-800',
            styles.iconBg
          )}
        >
          <Icon
            className={cn(
              'text-gray-400 dark:text-gray-500',
              styles.icon
            )}
            aria-hidden="true"
          />
        </div>

        {/* Title */}
        <h3
          className={cn(
            'font-semibold text-gray-900 dark:text-white mb-1',
            styles.title
          )}
        >
          {title}
        </h3>

        {/* Description */}
        {description && (
          <p
            className={cn(
              'text-gray-500 dark:text-gray-400 max-w-sm',
              styles.description
            )}
          >
            {description}
          </p>
        )}

        {/* Actions */}
        {(action || secondaryAction || children) && (
          <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
            {action && (
              <Button
                variant={action.variant || 'primary'}
                size={size === 'lg' ? 'lg' : 'md'}
                onClick={action.onClick}
              >
                {action.label}
              </Button>
            )}
            {secondaryAction && (
              <Button
                variant="ghost"
                size={size === 'lg' ? 'lg' : 'md'}
                onClick={secondaryAction.onClick}
              >
                {secondaryAction.label}
              </Button>
            )}
            {children}
          </div>
        )}
      </div>
    )
  }
)

EmptyState.displayName = 'EmptyState'

// Preset empty states for common use cases

export function NoSearchResults({
  query,
  onClear,
}: {
  query?: string
  onClear?: () => void
}) {
  return (
    <EmptyState
      icon={Search}
      title="Inga resultat hittades"
      description={
        query
          ? `Inga resultat matchade "${query}". Prova att ändra dina söktermer.`
          : 'Prova att ändra dina söktermer eller filter.'
      }
      action={onClear ? { label: 'Rensa sökning', onClick: onClear, variant: 'secondary' } : undefined}
    />
  )
}

export function NoDataFound({
  title = 'Ingen data',
  description = 'Det finns ingen data att visa just nu.',
  action,
}: {
  title?: string
  description?: string
  action?: EmptyStateProps['action']
}) {
  return (
    <EmptyState
      icon={FileX}
      title={title}
      description={description}
      action={action}
    />
  )
}

export function ErrorState({
  title = 'Något gick fel',
  description = 'Ett fel uppstod. Försök igen senare.',
  onRetry,
}: {
  title?: string
  description?: string
  onRetry?: () => void
}) {
  return (
    <EmptyState
      icon={AlertCircle}
      title={title}
      description={description}
      action={onRetry ? { label: 'Försök igen', onClick: onRetry, variant: 'secondary' } : undefined}
    />
  )
}

export default EmptyState
