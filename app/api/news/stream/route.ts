import { NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder()
  const supabase = createServerClient()

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial connection message
      controller.enqueue(encoder.encode(`event: connected\ndata: {"status": "connected"}\n\n`))

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
            const data = JSON.stringify({
              type: 'protocol',
              operation: payload.eventType,
              record: payload.new,
              old: payload.old,
            })
            controller.enqueue(encoder.encode(`event: change\ndata: ${data}\n\n`))
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
            const data = JSON.stringify({
              type: 'kungorelse',
              operation: payload.eventType,
              record: payload.new,
              old: payload.old,
            })
            controller.enqueue(encoder.encode(`event: change\ndata: ${data}\n\n`))
          }
        )
        .subscribe()

      // Send heartbeat every 30 seconds
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`event: heartbeat\ndata: {"time": "${new Date().toISOString()}"}\n\n`))
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
