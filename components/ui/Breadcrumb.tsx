'use client'

import { forwardRef, HTMLAttributes, ReactNode, Fragment } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { ChevronRight, Home } from 'lucide-react'

export interface BreadcrumbItem {
  label: string
  href?: string
  icon?: ReactNode
}

export interface BreadcrumbProps extends HTMLAttributes<HTMLElement> {
  items: BreadcrumbItem[]
  separator?: ReactNode
  showHome?: boolean
  homeHref?: string
}

/**
 * Breadcrumb navigation component
 *
 * @example
 * <Breadcrumb
 *   items={[
 *     { label: 'Nyheter', href: '/news' },
 *     { label: 'Bolag', href: '/news/company' },
 *     { label: 'Artikel' },
 *   ]}
 * />
 */
export const Breadcrumb = forwardRef<HTMLElement, BreadcrumbProps>(
  (
    {
      items,
      separator,
      showHome = true,
      homeHref = '/',
      className,
      ...props
    },
    ref
  ) => {
    // Prepend home item if showHome is true
    const allItems: BreadcrumbItem[] = showHome
      ? [{ label: 'Hem', href: homeHref, icon: <Home className="w-4 h-4" /> }, ...items]
      : items

    const defaultSeparator = (
      <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500" aria-hidden="true" />
    )

    return (
      <nav
        ref={ref}
        aria-label="Breadcrumb"
        className={cn('flex items-center', className)}
        {...props}
      >
        <ol className="flex items-center gap-1 text-sm">
          {allItems.map((item, index) => {
            const isLast = index === allItems.length - 1
            const isFirst = index === 0

            return (
              <Fragment key={index}>
                <li className="flex items-center">
                  {item.href && !isLast ? (
                    <Link
                      href={item.href}
                      className={cn(
                        'flex items-center gap-1.5 text-gray-500 dark:text-gray-400',
                        'hover:text-gray-900 dark:hover:text-white',
                        'transition-colors duration-150',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded'
                      )}
                    >
                      {item.icon && <span aria-hidden="true">{item.icon}</span>}
                      {!isFirst && <span>{item.label}</span>}
                      {isFirst && !item.icon && <span>{item.label}</span>}
                    </Link>
                  ) : (
                    <span
                      className={cn(
                        'flex items-center gap-1.5',
                        isLast
                          ? 'font-medium text-gray-900 dark:text-white'
                          : 'text-gray-500 dark:text-gray-400'
                      )}
                      aria-current={isLast ? 'page' : undefined}
                    >
                      {item.icon && <span aria-hidden="true">{item.icon}</span>}
                      {!isFirst && <span>{item.label}</span>}
                      {isFirst && !item.icon && <span>{item.label}</span>}
                    </span>
                  )}
                </li>

                {!isLast && (
                  <li className="flex items-center" aria-hidden="true">
                    {separator || defaultSeparator}
                  </li>
                )}
              </Fragment>
            )
          })}
        </ol>
      </nav>
    )
  }
)

Breadcrumb.displayName = 'Breadcrumb'

/**
 * Simple breadcrumb for page headers
 */
export function PageBreadcrumb({
  items,
  className,
}: {
  items: BreadcrumbItem[]
  className?: string
}) {
  return (
    <div className={cn('mb-4', className)}>
      <Breadcrumb items={items} />
    </div>
  )
}

export default Breadcrumb
