import { createServerClient } from './supabase'

export interface WatchlistItem {
  id: string
  slack_user_id: string
  slack_channel_id: string
  org_number: string
  company_name: string
  watch_types: string[] // ['protokoll', 'kungorelse', 'all']
  created_at: string
}

export interface WatchlistNotification {
  type: 'protokoll' | 'kungorelse'
  org_number: string
  company_name: string
  title: string
  date: string
  details: Record<string, unknown>
}

export interface WatchlistCheckResult {
  success: boolean
  notificationsSent: number
  errors: string[]
  checkedProtocols: number
  checkedKungorelser: number
  watchedCompanies: number
}

// Format org number consistently
function formatOrgNumber(orgNumber: string): string {
  const clean = orgNumber.replace(/-/g, '')
  return clean.length === 10
    ? `${clean.slice(0, 6)}-${clean.slice(6)}`
    : orgNumber
}

// Add a company to user's watchlist
export async function addToWatchlist(
  slackUserId: string,
  slackChannelId: string,
  orgNumber: string,
  companyName: string,
  watchTypes: string[] = ['all']
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServerClient()
  const displayOrg = formatOrgNumber(orgNumber)

  // Check if already watching
  const { data: existing } = await supabase
    .from('slack_watchlist')
    .select('id')
    .eq('slack_user_id', slackUserId)
    .eq('org_number', displayOrg)
    .single()

  if (existing) {
    return { success: false, error: 'Du bevakar redan detta bolag' }
  }

  const { error } = await supabase
    .from('slack_watchlist')
    .insert({
      slack_user_id: slackUserId,
      slack_channel_id: slackChannelId,
      org_number: displayOrg,
      company_name: companyName,
      watch_types: watchTypes
    })

  if (error) {
    console.error('Error adding to watchlist:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

// Remove a company from user's watchlist
export async function removeFromWatchlist(
  slackUserId: string,
  orgNumber: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServerClient()
  const displayOrg = formatOrgNumber(orgNumber)

  const { error } = await supabase
    .from('slack_watchlist')
    .delete()
    .eq('slack_user_id', slackUserId)
    .eq('org_number', displayOrg)

  if (error) {
    console.error('Error removing from watchlist:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

// Get user's watchlist
export async function getWatchlist(slackUserId: string): Promise<WatchlistItem[]> {
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('slack_watchlist')
    .select('*')
    .eq('slack_user_id', slackUserId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching watchlist:', error)
    return []
  }

  return data || []
}

// Get all watchers for a specific org number
export async function getWatchersForOrg(orgNumber: string): Promise<WatchlistItem[]> {
  const supabase = createServerClient()
  const displayOrg = formatOrgNumber(orgNumber)

  const { data, error } = await supabase
    .from('slack_watchlist')
    .select('*')
    .eq('org_number', displayOrg)

  if (error) {
    console.error('Error fetching watchers:', error)
    return []
  }

  return data || []
}

// Get all unique watched org numbers
export async function getAllWatchedOrgNumbers(): Promise<string[]> {
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('slack_watchlist')
    .select('org_number')

  if (error) {
    console.error('Error fetching watched org numbers:', error)
    return []
  }

  // Return unique org numbers
  const unique = Array.from(new Set(data?.map(d => d.org_number) || []))
  return unique
}

// Check if a notification has already been sent
async function hasNotificationBeenSent(
  watchlistId: string,
  itemType: 'protokoll' | 'kungorelse',
  itemId: string
): Promise<boolean> {
  const supabase = createServerClient()

  const { data } = await supabase
    .from('slack_watchlist_notifications')
    .select('id')
    .eq('watchlist_id', watchlistId)
    .eq('item_type', itemType)
    .eq('item_id', itemId)
    .single()

  return !!data
}

// Record that a notification has been sent
async function recordNotificationSent(
  watchlistId: string,
  itemType: 'protokoll' | 'kungorelse',
  itemId: string,
  slackChannelId: string,
  slackUserId: string,
  orgNumber: string
): Promise<void> {
  const supabase = createServerClient()

  const { error } = await supabase
    .from('slack_watchlist_notifications')
    .insert({
      watchlist_id: watchlistId,
      item_type: itemType,
      item_id: itemId,
      slack_channel_id: slackChannelId,
      slack_user_id: slackUserId,
      org_number: orgNumber
    })

  if (error) {
    // Ignore duplicate key errors (notification already recorded)
    if (!error.message.includes('duplicate key')) {
      console.error('Error recording notification:', error)
    }
  }
}

// Check for new items and notify watchers
export async function checkAndNotifyWatchers(
  lookbackHours: number = 1
): Promise<WatchlistCheckResult> {
  const supabase = createServerClient()
  const result: WatchlistCheckResult = {
    success: true,
    notificationsSent: 0,
    errors: [],
    checkedProtocols: 0,
    checkedKungorelser: 0,
    watchedCompanies: 0
  }

  try {
    // Get all unique watched org numbers
    const watchedOrgNumbers = await getAllWatchedOrgNumbers()
    result.watchedCompanies = watchedOrgNumbers.length

    if (watchedOrgNumbers.length === 0) {
      return result
    }

    const lookbackTime = new Date(Date.now() - lookbackHours * 60 * 60 * 1000).toISOString()

    // Check new protocols for watched companies
    const { data: newProtocols, error: protocolError } = await supabase
      .from('ProtocolAnalysis')
      .select('id, org_number, company_name, protocol_type, protocol_date, news_content, created_at')
      .in('org_number', watchedOrgNumbers)
      .gte('created_at', lookbackTime)
      .order('created_at', { ascending: false })

    if (protocolError) {
      result.errors.push(`Protocol query error: ${protocolError.message}`)
    }

    result.checkedProtocols = newProtocols?.length || 0

    if (newProtocols && newProtocols.length > 0) {
      for (const protocol of newProtocols) {
        const watchers = await getWatchersForOrg(protocol.org_number)
        const itemId = `protocol-${protocol.id}`

        for (const watcher of watchers) {
          // Check if this notification type is wanted
          if (!watcher.watch_types.includes('all') && !watcher.watch_types.includes('protokoll')) {
            continue
          }

          // Check if already notified
          const alreadySent = await hasNotificationBeenSent(watcher.id, 'protokoll', itemId)
          if (alreadySent) {
            continue
          }

          // Send notification
          const notificationResult = await sendWatchlistNotification(watcher.slack_channel_id, {
            type: 'protokoll',
            org_number: protocol.org_number,
            company_name: protocol.company_name,
            title: (protocol.news_content as Record<string, string>)?.rubrik || protocol.protocol_type,
            date: protocol.protocol_date,
            details: protocol
          })

          if (notificationResult.success) {
            // Record that we sent this notification
            await recordNotificationSent(
              watcher.id,
              'protokoll',
              itemId,
              watcher.slack_channel_id,
              watcher.slack_user_id,
              watcher.org_number
            )
            result.notificationsSent++
          } else if (notificationResult.error) {
            result.errors.push(`Notification error for ${watcher.slack_channel_id}: ${notificationResult.error}`)
          }
        }
      }
    }

    // Check new kungorelser for watched companies
    const { data: newKungorelser, error: kungorelseError } = await supabase
      .from('Kungorelser')
      .select('id, org_number, company_name, typ, kategori, rubrik, publicerad, created_at')
      .in('org_number', watchedOrgNumbers)
      .gte('created_at', lookbackTime)
      .order('created_at', { ascending: false })

    if (kungorelseError) {
      result.errors.push(`Kungorelse query error: ${kungorelseError.message}`)
    }

    result.checkedKungorelser = newKungorelser?.length || 0

    if (newKungorelser && newKungorelser.length > 0) {
      for (const kungorelse of newKungorelser) {
        const watchers = await getWatchersForOrg(kungorelse.org_number)
        const itemId = `kungorelse-${kungorelse.id}`

        for (const watcher of watchers) {
          // Check if this notification type is wanted
          if (!watcher.watch_types.includes('all') && !watcher.watch_types.includes('kungorelse')) {
            continue
          }

          // Check if already notified
          const alreadySent = await hasNotificationBeenSent(watcher.id, 'kungorelse', itemId)
          if (alreadySent) {
            continue
          }

          // Send notification
          const notificationResult = await sendWatchlistNotification(watcher.slack_channel_id, {
            type: 'kungorelse',
            org_number: kungorelse.org_number,
            company_name: kungorelse.company_name,
            title: kungorelse.rubrik || kungorelse.typ,
            date: kungorelse.publicerad,
            details: kungorelse
          })

          if (notificationResult.success) {
            // Record that we sent this notification
            await recordNotificationSent(
              watcher.id,
              'kungorelse',
              itemId,
              watcher.slack_channel_id,
              watcher.slack_user_id,
              watcher.org_number
            )
            result.notificationsSent++
          } else if (notificationResult.error) {
            result.errors.push(`Notification error for ${watcher.slack_channel_id}: ${notificationResult.error}`)
          }
        }
      }
    }
  } catch (error) {
    result.success = false
    result.errors.push(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }

  return result
}

// Send notification to Slack
async function sendWatchlistNotification(
  channelId: string,
  notification: WatchlistNotification
): Promise<{ success: boolean; error?: string }> {
  const token = process.env.SLACK_BOT_TOKEN
  if (!token) {
    return { success: false, error: 'SLACK_BOT_TOKEN not configured' }
  }

  const emoji = notification.type === 'protokoll' ? ':clipboard:' : ':loudspeaker:'
  const typeLabel = notification.type === 'protokoll' ? 'Nytt protokoll' : 'Ny kungörelse'

  // Get additional details based on type
  const details = notification.details as Record<string, unknown>
  let extraInfo = ''

  if (notification.type === 'protokoll') {
    const protocolType = details.protocol_type as string | undefined
    if (protocolType) {
      extraInfo = `*Typ:* ${protocolType}`
    }
  } else {
    const kategori = details.kategori as string | undefined
    const typ = details.typ as string | undefined
    if (kategori) {
      extraInfo = `*Kategori:* ${kategori}`
      if (typ && typ !== kategori) {
        extraInfo += ` - ${typ}`
      }
    }
  }

  const blocks = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `${emoji} ${typeLabel} - Bevakat bolag`,
        emoji: true
      }
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*${notification.company_name}*\n${notification.org_number}`
      }
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Rubrik:*\n${notification.title || 'Ingen rubrik'}`
        },
        {
          type: 'mrkdwn',
          text: `*Datum:*\n${notification.date || 'Okänt'}`
        }
      ]
    }
  ]

  // Add extra info if available
  if (extraInfo) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: extraInfo
      }
    } as typeof blocks[number])
  }

  // Add action buttons
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  blocks.push({
    type: 'actions',
    elements: [
      {
        type: 'button',
        text: {
          type: 'plain_text',
          text: ':memo: Skriv notis',
          emoji: true
        },
        action_id: 'generate_notis',
        value: notification.org_number
      },
      {
        type: 'button',
        text: {
          type: 'plain_text',
          text: ':mag: Visa detaljer',
          emoji: true
        },
        action_id: 'show_details',
        value: JSON.stringify({ type: notification.type, org: notification.org_number })
      }
    ]
  } as any)

  // Add context footer
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  blocks.push({
    type: 'context',
    elements: [
      {
        type: 'mrkdwn',
        text: `Bevakningsnotis | Hantera med \`/bevaka\``
      }
    ]
  } as any)

  try {
    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        channel: channelId,
        blocks,
        text: `${typeLabel} från ${notification.company_name} (${notification.org_number})`
      })
    })

    const data = await response.json()

    if (!data.ok) {
      console.error('Slack API error:', data.error)
      return { success: false, error: data.error }
    }

    return { success: true }
  } catch (error) {
    console.error('Error sending watchlist notification:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Cleanup old notification records (to be called periodically)
export async function cleanupOldNotifications(): Promise<number> {
  const supabase = createServerClient()

  // Call the cleanup function
  const { data, error } = await supabase.rpc('cleanup_old_watchlist_notifications')

  if (error) {
    console.error('Error cleaning up notifications:', error)
    return 0
  }

  return data || 0
}
