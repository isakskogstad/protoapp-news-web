// Supabase Edge Function: Send Push Notifications
// Triggered by database webhook when new news is inserted

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') || ''
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') || ''
const VAPID_SUBJECT = 'mailto:push@loopdesk.se'

// Web Push implementation for Deno
async function sendPushNotification(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: { title: string; body: string; url?: string; tag?: string }
): Promise<boolean> {
  try {
    // Import web-push compatible library for Deno
    const { default: webPush } = await import('https://esm.sh/web-push@3.6.6')

    webPush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

    await webPush.sendNotification(
      subscription,
      JSON.stringify(payload),
      { TTL: 86400 } // 24 hours
    )

    return true
  } catch (error) {
    console.error('Push notification failed:', error)

    // If subscription is invalid, return false to mark for deletion
    if (error.statusCode === 404 || error.statusCode === 410) {
      return false
    }

    return true // Keep subscription for temporary errors
  }
}

serve(async (req) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Content-Type': 'application/json',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Parse the webhook payload
    const { type, table, record } = await req.json()

    // Only process INSERT events
    if (type !== 'INSERT') {
      return new Response(JSON.stringify({ message: 'Ignored non-INSERT event' }), { headers })
    }

    // Build notification content based on table
    let title = 'Ny händelse'
    let body = ''
    let url = '/'
    let tag = 'loopdesk-news'

    if (table === 'ProtocolAnalysis') {
      title = record.company_name || 'Ny protokollanalys'
      body = record.news_content?.rubrik || record.protocol_type || 'Nytt protokoll analyserat'
      url = `/news/${record.id}`
      tag = `protocol-${record.id}`
    } else if (table === 'Kungorelser') {
      title = record.company_name || 'Ny kungörelse'
      body = record.underrubrik || record.typ || record.amnesomrade || 'Ny kungörelse publicerad'
      url = `/news/${record.id}`
      tag = `kungorelse-${record.id}`
    }

    // Get all push subscriptions
    const { data: subscriptions, error: fetchError } = await supabase
      .from('PushSubscriptions')
      .select('*')

    if (fetchError) {
      console.error('Error fetching subscriptions:', fetchError)
      return new Response(JSON.stringify({ error: 'Failed to fetch subscriptions' }), { 
        status: 500, headers 
      })
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ message: 'No subscriptions' }), { headers })
    }

    // Send notifications to all subscribers
    const payload = { title, body, url, tag }
    const results = await Promise.all(
      subscriptions.map(async (sub) => {
        const success = await sendPushNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          payload
        )
        return { endpoint: sub.endpoint, success }
      })
    )

    // Remove invalid subscriptions
    const invalidEndpoints = results
      .filter(r => !r.success)
      .map(r => r.endpoint)

    if (invalidEndpoints.length > 0) {
      await supabase
        .from('PushSubscriptions')
        .delete()
        .in('endpoint', invalidEndpoints)
    }

    const successCount = results.filter(r => r.success).length

    return new Response(
      JSON.stringify({ 
        message: 'Notifications sent',
        sent: successCount,
        failed: invalidEndpoints.length
      }),
      { headers }
    )
  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers }
    )
  }
})
