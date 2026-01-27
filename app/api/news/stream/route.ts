import { NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { protocolToNewsItem, kungorelseToNewsItem } from '@/lib/utils'
import { ProtocolAnalysis, Kungorelse } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder()
  const supabase = createServerClient()

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial connection message
      controller.enqueue(encoder.encode(`data: {"type": "connected", "status": "connected"}\n\n`))

      // Subscribe to ProtocolAnalysis changes
      const protocolChannel = supabase
        .channel('protocol-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'ProtocolAnalysis',
          },
          (payload) => {
            try {
              // Transform to NewsItem format
              const newsItem = payload.new
                ? protocolToNewsItem(payload.new as ProtocolAnalysis)
                : null

              const data = JSON.stringify({
                type: payload.eventType, // 'INSERT', 'UPDATE', 'DELETE'
                source: 'protocol',
                payload: newsItem,
                oldId: (payload.old as ProtocolAnalysis)?.id,
              })
              controller.enqueue(encoder.encode(`data: ${data}\n\n`))
            } catch (err) {
              console.error('Error processing protocol change:', err)
            }
          }
        )
        .subscribe()

      // Subscribe to Kungorelser changes
      const kungorelseChannel = supabase
        .channel('kungorelse-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'Kungorelser',
          },
          (payload) => {
            try {
              // Transform to NewsItem format
              const newsItem = payload.new
                ? kungorelseToNewsItem(payload.new as Kungorelse)
                : null

              const data = JSON.stringify({
                type: payload.eventType, // 'INSERT', 'UPDATE', 'DELETE'
                source: 'kungorelse',
                payload: newsItem,
                oldId: (payload.old as Kungorelse)?.id,
              })
              controller.enqueue(encoder.encode(`data: ${data}\n\n`))
            } catch (err) {
              console.error('Error processing kungorelse change:', err)
            }
          }
        )
        .subscribe()

      // Send heartbeat every 30 seconds
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`data: {"type": "heartbeat", "time": "${new Date().toISOString()}"}\n\n`))
        } catch {
          clearInterval(heartbeatInterval)
        }
      }, 30000)

      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeatInterval)
        supabase.removeChannel(protocolChannel)
        supabase.removeChannel(kungorelseChannel)
        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
