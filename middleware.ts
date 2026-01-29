import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(_req) {
    // If authenticated, continue
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

// Protect all routes except login, API auth, and public API routes
export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - /login
     * - /api/auth (NextAuth routes)
     * - /api/company (public company data)
     * - /api/slack/events (Slack webhook - must be public)
     * - /_next (Next.js internals)
     * - /favicon.ico, etc.
     */
    '/((?!login|api/auth|api/company|api/slack/events|api/slack/commands|_next|favicon.ico).*)',
  ],
}
