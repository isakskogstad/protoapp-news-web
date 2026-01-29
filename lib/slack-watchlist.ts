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

// Add a company to user's watchlist
export async function addToWatchlist(
  slackUserId: string,
  slackChannelId: string,
  orgNumber: string,
  companyName: string,
  watchTypes: string[] = ['all']
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServerClient()

  // Format org number
  const formattedOrg = orgNumber.replace(/-/g, '')
  const displayOrg = formattedOrg.length === 10
    ? `${formattedOrg.slice(0, 6)}-${formattedOrg.slice(6)}`
    : orgNumber

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

  const formattedOrg = orgNumber.replace(/-/g, '')
  const displayOrg = formattedOrg.length === 10
    ? `${formattedOrg.slice(0, 6)}-${formattedOrg.slice(6)}`
    : orgNumber

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

  const formattedOrg = orgNumber.replace(/-/g, '')
  const displayOrg = formattedOrg.length === 10
    ? `${formattedOrg.slice(0, 6)}-${formattedOrg.slice(6)}`
    : orgNumber

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

// Check for new items and notify watchers
export async function checkAndNotifyWatchers(): Promise<number> {
  const supabase = createServerClient()
  let notificationsSent = 0

  // Get items from last hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

  // Check new protocols
  const { data: newProtocols } = await supabase
    .from('ProtocolAnalysis')
    .select('org_number, company_name, protocol_type, protocol_date, news_content')
    .gte('created_at', oneHourAgo)

  if (newProtocols) {
    for (const protocol of newProtocols) {
      const watchers = await getWatchersForOrg(protocol.org_number)
      for (const watcher of watchers) {
        if (watcher.watch_types.includes('all') || watcher.watch_types.includes('protokoll')) {
          await sendWatchlistNotification(watcher.slack_channel_id, {
            type: 'protokoll',
            org_number: protocol.org_number,
            company_name: protocol.company_name,
            title: (protocol.news_content as Record<string, string>)?.rubrik || protocol.protocol_type,
            date: protocol.protocol_date,
            details: protocol
          })
          notificationsSent++
        }
      }
    }
  }

  // Check new kungörelser
  const { data: newKungorelser } = await supabase
    .from('Kungorelser')
    .select('org_number, company_name, typ, kategori, rubrik, publicerad')
    .gte('created_at', oneHourAgo)

  if (newKungorelser) {
    for (const kungorelse of newKungorelser) {
      const watchers = await getWatchersForOrg(kungorelse.org_number)
      for (const watcher of watchers) {
        if (watcher.watch_types.includes('all') || watcher.watch_types.includes('kungorelse')) {
          await sendWatchlistNotification(watcher.slack_channel_id, {
            type: 'kungorelse',
            org_number: kungorelse.org_number,
            company_name: kungorelse.company_name,
            title: kungorelse.rubrik || kungorelse.typ,
            date: kungorelse.publicerad,
            details: kungorelse
          })
          notificationsSent++
        }
      }
    }
  }

  return notificationsSent
}

// Send notification to Slack
async function sendWatchlistNotification(
  channelId: string,
  notification: WatchlistNotification
): Promise<void> {
  const token = process.env.SLACK_BOT_TOKEN
  if (!token) return

  const emoji = notification.type === 'protokoll' ? '📋' : '📢'
  const typeLabel = notification.type === 'protokoll' ? 'Nytt protokoll' : 'Ny kungörelse'

  const blocks = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `${emoji} *${typeLabel}* från bevakat bolag\n\n*${notification.company_name}* (${notification.org_number})`
      }
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Rubrik:*\n${notification.title}`
        },
        {
          type: 'mrkdwn',
          text: `*Datum:*\n${notification.date}`
        }
      ]
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: '📝 Skriv notis'
          },
          action_id: 'generate_notis',
          value: notification.org_number
        },
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: '🔍 Visa detaljer'
          },
          action_id: 'show_details',
          value: JSON.stringify({ type: notification.type, org: notification.org_number })
        }
      ]
    }
  ]

  try {
    await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        channel: channelId,
        blocks,
        text: `${typeLabel} från ${notification.company_name}`
      })
    })
  } catch (error) {
    console.error('Error sending watchlist notification:', error)
  }
}
