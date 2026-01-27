import './globals.css'
import type { Metadata } from 'next'
import Providers from '@/components/Providers'
import EditorialChat from '@/components/EditorialChat'

export const metadata: Metadata = {
  title: 'LoopDesk',
  description: 'Redaktionell bevakning och nyhetsflöde',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="sv">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&family=Lato:wght@400;700;900&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body min-h-screen antialiased bg-[var(--bg-dynamic)] text-[var(--text-dynamic)]">
        <Providers>
          <div className="relative z-10 flex flex-col min-h-screen">
            {children}
          </div>
          <EditorialChat />
        </Providers>
      </body>
    </html>
  )
}
