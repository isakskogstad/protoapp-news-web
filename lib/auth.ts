import { NextAuthOptions } from 'next-auth'
import SlackProvider from 'next-auth/providers/slack'

// Allowed Slack user IDs or email addresses
// Add users here who should have access
const ALLOWED_USERS = process.env.ALLOWED_SLACK_USERS?.split(',') || []

export const authOptions: NextAuthOptions = {
  providers: [
    SlackProvider({
      clientId: process.env.SLACK_CLIENT_ID!,
      clientSecret: process.env.SLACK_CLIENT_SECRET!,
      authorization: {
        params: {
          // Request user scopes to post as user
          user_scope: 'chat:write,users:read',
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // If no allowed users configured, allow all
      if (ALLOWED_USERS.length === 0) {
        return true
      }

      // Check if user email or ID is in allowed list
      const isAllowed = ALLOWED_USERS.some(
        allowed =>
          allowed === user.email ||
          allowed === user.id ||
          allowed === account?.providerAccountId
      )

      if (!isAllowed) {
        console.log(`Access denied for user: ${user.email}`)
        return false
      }

      return true
    },
    async jwt({ token, account }) {
      // Save Slack access token to JWT on initial sign in
      if (account) {
        token.slackAccessToken = account.access_token
        token.slackUserId = account.providerAccountId
      }
      return token
    },
    async session({ session, token }) {
      // Add user ID and Slack token to session
      if (session.user && token) {
        if (token.sub) {
          (session.user as Record<string, unknown>).id = token.sub
        }
        if (token.slackAccessToken) {
          (session.user as Record<string, unknown>).slackAccessToken = token.slackAccessToken
        }
        if (token.slackUserId) {
          (session.user as Record<string, unknown>).slackUserId = token.slackUserId
        }
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
}
