/**
 * Slack Web API Client Configuration
 *
 * Provides singleton bot client and user client factory with:
 * - Retry logic with exponential backoff for rate limits and server errors
 * - Request timeout (10 seconds)
 * - Basic rate limit tracking
 */

import { WebClient, LogLevel, RetryOptions } from '@slack/web-api'

// Environment configuration
const BOT_TOKEN = process.env.SLACK_BOT_TOKEN
const CHANNEL_ID = process.env.SLACK_CHANNEL_ID

// Client configuration
const DEFAULT_TIMEOUT_MS = 10_000
const MAX_RETRIES = 3
const INITIAL_RETRY_DELAY_MS = 1_000
const MAX_RETRY_DELAY_MS = 30_000

// Rate limit tracking
interface RateLimitInfo {
  endpoint: string
  retryAfter: number
  timestamp: number
}

class RateLimitTracker {
  private limits: Map<string, RateLimitInfo> = new Map()

  record(endpoint: string, retryAfter: number): void {
    this.limits.set(endpoint, {
      endpoint,
      retryAfter,
      timestamp: Date.now(),
    })
  }

  isRateLimited(endpoint: string): boolean {
    const info = this.limits.get(endpoint)
    if (!info) return false

    const elapsed = (Date.now() - info.timestamp) / 1000
    if (elapsed >= info.retryAfter) {
      this.limits.delete(endpoint)
      return false
    }
    return true
  }

  getRemainingWait(endpoint: string): number {
    const info = this.limits.get(endpoint)
    if (!info) return 0

    const elapsed = (Date.now() - info.timestamp) / 1000
    return Math.max(0, info.retryAfter - elapsed)
  }

  getAll(): RateLimitInfo[] {
    // Clean up expired entries
    const now = Date.now()
    const entries = Array.from(this.limits.entries())
    for (const [endpoint, info] of entries) {
      const elapsed = (now - info.timestamp) / 1000
      if (elapsed >= info.retryAfter) {
        this.limits.delete(endpoint)
      }
    }
    return Array.from(this.limits.values())
  }

  clear(): void {
    this.limits.clear()
  }
}

// Singleton rate limit tracker
export const rateLimitTracker = new RateLimitTracker()

/**
 * Custom retry configuration with exponential backoff
 */
const retryConfig: RetryOptions = {
  retries: MAX_RETRIES,
  factor: 2,
  randomize: true,
}

/**
 * Sleep utility for manual retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Calculate backoff delay with jitter
 */
function calculateBackoff(attempt: number, baseDelay: number = INITIAL_RETRY_DELAY_MS): number {
  const exponentialDelay = baseDelay * Math.pow(2, attempt)
  const jitter = Math.random() * 0.3 * exponentialDelay
  return Math.min(exponentialDelay + jitter, MAX_RETRY_DELAY_MS)
}

/**
 * Check if error is retryable
 */
function isRetryableError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false

  const err = error as Record<string, unknown>

  // Rate limit error (429)
  if (err.code === 'slack_webapi_platform_error' && err.data) {
    const data = err.data as Record<string, unknown>
    if (data.error === 'ratelimited') return true
  }

  // HTTP status code based errors
  const statusCode = err.statusCode as number | undefined
  if (statusCode) {
    // 429 Too Many Requests
    if (statusCode === 429) return true
    // 5xx Server errors
    if (statusCode >= 500 && statusCode < 600) return true
  }

  // Network/timeout errors
  const code = err.code as string | undefined
  if (code) {
    const retryableCodes = [
      'ETIMEDOUT',
      'ECONNRESET',
      'ECONNREFUSED',
      'ENOTFOUND',
      'EAI_AGAIN',
      'EPIPE',
      'EHOSTUNREACH',
    ]
    if (retryableCodes.includes(code)) return true
  }

  return false
}

/**
 * Extract Retry-After header value from error
 */
function getRetryAfter(error: unknown): number | null {
  if (!error || typeof error !== 'object') return null

  const err = error as Record<string, unknown>

  // Check for retryAfter in error data
  if (err.data && typeof err.data === 'object') {
    const data = err.data as Record<string, unknown>
    if (typeof data.retry_after === 'number') {
      return data.retry_after
    }
  }

  // Check headers
  if (err.headers && typeof err.headers === 'object') {
    const headers = err.headers as Record<string, string>
    const retryAfter = headers['retry-after'] || headers['Retry-After']
    if (retryAfter) {
      const parsed = parseInt(retryAfter, 10)
      if (!isNaN(parsed)) return parsed
    }
  }

  return null
}

/**
 * Wrapper for Slack API calls with custom retry logic
 *
 * Use this for methods that need more control over retry behavior
 * than the built-in WebClient retry provides.
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  endpoint: string = 'unknown'
): Promise<T> {
  let lastError: unknown

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error

      if (!isRetryableError(error)) {
        throw error
      }

      if (attempt === MAX_RETRIES) {
        throw error
      }

      // Get retry delay
      let delayMs: number
      const retryAfter = getRetryAfter(error)

      if (retryAfter !== null) {
        // Use Retry-After header value (convert to ms)
        delayMs = retryAfter * 1000
        rateLimitTracker.record(endpoint, retryAfter)
        console.warn(
          `[Slack] Rate limited on ${endpoint}, waiting ${retryAfter}s (attempt ${attempt + 1}/${MAX_RETRIES + 1})`
        )
      } else {
        // Use exponential backoff
        delayMs = calculateBackoff(attempt)
        console.warn(
          `[Slack] Retryable error on ${endpoint}, backing off ${Math.round(delayMs)}ms (attempt ${attempt + 1}/${MAX_RETRIES + 1})`
        )
      }

      await sleep(delayMs)
    }
  }

  throw lastError
}

/**
 * Create a configured WebClient instance
 */
function createClient(token: string | undefined): WebClient {
  return new WebClient(token, {
    timeout: DEFAULT_TIMEOUT_MS,
    retryConfig,
    logLevel: process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.WARN,
  })
}

/**
 * Bot client singleton
 *
 * Used for bot-initiated actions like posting messages,
 * updating App Home, etc.
 */
export const botClient = createClient(BOT_TOKEN)

/**
 * Get a WebClient configured with a user's OAuth token
 *
 * Use this when you need to perform actions on behalf of a user,
 * such as reading their messages or accessing user-specific data.
 *
 * @param token - User's OAuth access token from authentication flow
 * @returns Configured WebClient instance
 */
export function getUserClient(token: string): WebClient {
  if (!token) {
    throw new Error('User token is required')
  }
  return createClient(token)
}

/**
 * Check if the bot client is properly configured
 */
export function isBotConfigured(): boolean {
  return Boolean(BOT_TOKEN)
}

/**
 * Check if channel is configured
 */
export function isChannelConfigured(): boolean {
  return Boolean(CHANNEL_ID)
}

// Export configuration values
export { CHANNEL_ID, BOT_TOKEN }

// Export types for consumers
export type { WebClient }
