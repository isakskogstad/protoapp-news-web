import { NextRequest, NextResponse } from 'next/server'
import { checkAndNotifyWatchers, cleanupOldNotifications } from '@/lib/slack-watchlist'

// Secret key for cron job authentication
const CRON_SECRET = process.env.CRON_SECRET

/**
 * POST /api/slack/watchlist-check
 *
 * Check for new protocols and kungorelser for watched companies,
 * and send notifications to the appropriate Slack channels.
 *
 * This endpoint is designed to be called by a cron job (e.g., every hour).
 *
 * Query parameters:
 * - lookback: Number of hours to look back (default: 1)
 * - cleanup: If 'true', also clean up old notification records
 *
 * Headers:
 * - Authorization: Bearer <CRON_SECRET> (required in production)
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  // Verify authorization in production
  if (CRON_SECRET) {
    const authHeader = request.headers.get('Authorization')
    const providedSecret = authHeader?.replace('Bearer ', '')

    if (providedSecret !== CRON_SECRET) {
      console.log('[Watchlist Check] Unauthorized request')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
  }

  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const lookbackHours = parseInt(searchParams.get('lookback') || '1', 10)
    const shouldCleanup = searchParams.get('cleanup') === 'true'

    console.log(`[Watchlist Check] Starting check with lookback=${lookbackHours}h, cleanup=${shouldCleanup}`)

    // Run the watchlist check
    const result = await checkAndNotifyWatchers(lookbackHours)

    console.log(`[Watchlist Check] Completed: ${result.notificationsSent} notifications sent`)
    console.log(`[Watchlist Check] Checked: ${result.checkedProtocols} protocols, ${result.checkedKungorelser} kungorelser`)
    console.log(`[Watchlist Check] Watched companies: ${result.watchedCompanies}`)

    if (result.errors.length > 0) {
      console.warn('[Watchlist Check] Errors:', result.errors)
    }

    // Optionally cleanup old notification records
    let cleanedUp = 0
    if (shouldCleanup) {
      cleanedUp = await cleanupOldNotifications()
      console.log(`[Watchlist Check] Cleaned up ${cleanedUp} old notification records`)
    }

    const duration = Date.now() - startTime

    return NextResponse.json({
      success: result.success,
      notificationsSent: result.notificationsSent,
      checkedProtocols: result.checkedProtocols,
      checkedKungorelser: result.checkedKungorelser,
      watchedCompanies: result.watchedCompanies,
      errors: result.errors,
      cleanedUp: shouldCleanup ? cleanedUp : undefined,
      durationMs: duration,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('[Watchlist Check] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/slack/watchlist-check
 *
 * Get the status of the watchlist check system and perform a test check.
 */
export async function GET(request: NextRequest) {
  // Verify authorization in production
  if (CRON_SECRET) {
    const authHeader = request.headers.get('Authorization')
    const providedSecret = authHeader?.replace('Bearer ', '')

    if (providedSecret !== CRON_SECRET) {
      // Allow unauthenticated GET for status check, but limited info
      return NextResponse.json({
        status: 'Watchlist Check API',
        authenticated: false,
        message: 'Provide Authorization header with CRON_SECRET to see full status'
      })
    }
  }

  try {
    // Do a dry-run check to see how many items would be processed
    const { searchParams } = new URL(request.url)
    const lookbackHours = parseInt(searchParams.get('lookback') || '1', 10)

    // Import supabase to get counts
    const { createServerClient } = await import('@/lib/supabase')
    const supabase = createServerClient()

    // Get count of watched companies
    const { count: watchlistCount } = await supabase
      .from('slack_watchlist')
      .select('*', { count: 'exact', head: true })

    // Get unique watched org numbers
    const { data: watchedOrgs } = await supabase
      .from('slack_watchlist')
      .select('org_number')

    const uniqueOrgs = Array.from(new Set(watchedOrgs?.map(w => w.org_number) || []))

    // Get recent items count
    const lookbackTime = new Date(Date.now() - lookbackHours * 60 * 60 * 1000).toISOString()

    let recentProtocols = 0
    let recentKungorelser = 0

    if (uniqueOrgs.length > 0) {
      const { count: protocolCount } = await supabase
        .from('ProtocolAnalysis')
        .select('*', { count: 'exact', head: true })
        .in('org_number', uniqueOrgs)
        .gte('created_at', lookbackTime)

      const { count: kungorelseCount } = await supabase
        .from('Kungorelser')
        .select('*', { count: 'exact', head: true })
        .in('org_number', uniqueOrgs)
        .gte('created_at', lookbackTime)

      recentProtocols = protocolCount || 0
      recentKungorelser = kungorelseCount || 0
    }

    // Get count of sent notifications
    const { count: notificationCount } = await supabase
      .from('slack_watchlist_notifications')
      .select('*', { count: 'exact', head: true })

    return NextResponse.json({
      status: 'Watchlist Check API',
      authenticated: true,
      configuration: {
        slackBotTokenConfigured: !!process.env.SLACK_BOT_TOKEN,
        cronSecretConfigured: !!CRON_SECRET,
        lookbackHours
      },
      stats: {
        totalWatchlistEntries: watchlistCount || 0,
        uniqueWatchedCompanies: uniqueOrgs.length,
        recentProtocols,
        recentKungorelser,
        totalNotificationsSent: notificationCount || 0
      },
      usage: {
        checkEndpoint: 'POST /api/slack/watchlist-check',
        parameters: {
          lookback: 'Number of hours to look back (default: 1)',
          cleanup: 'Set to "true" to clean up old notification records'
        },
        example: 'curl -X POST -H "Authorization: Bearer YOUR_SECRET" https://your-app.com/api/slack/watchlist-check?lookback=1&cleanup=true'
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('[Watchlist Check GET] Error:', error)
    return NextResponse.json(
      {
        status: 'Watchlist Check API',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
