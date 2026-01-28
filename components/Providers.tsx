'use client'

import { SessionProvider } from 'next-auth/react'
import { ThemeProvider } from './ThemeProvider'
import ErrorBoundaryWrapper from './ErrorBoundary'
import { ToastProvider } from './ui/Toast'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        <ErrorBoundaryWrapper>
          <ToastProvider>
            {children}
          </ToastProvider>
        </ErrorBoundaryWrapper>
      </ThemeProvider>
    </SessionProvider>
  )
}
