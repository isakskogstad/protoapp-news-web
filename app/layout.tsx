import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Header from '@/components/Header'
import Providers from '@/components/Providers'
import OfflineBanner from '@/components/OfflineBanner'
import EditorialChat from '@/components/EditorialChat'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'LoopDesk',
  description: 'Bolagsnyheter i realtid',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="sv">
      <body className={`${inter.className} antialiased`}>
        <Providers>
          <Header />
          <main className="min-h-[calc(100vh-3.5rem)]">
            {children}
          </main>
          <OfflineBanner />
          <EditorialChat />
        </Providers>
      </body>
    </html>
  )
}
