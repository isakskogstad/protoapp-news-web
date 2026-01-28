'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { ProtocolAnalysis, Kungorelse, NewsItem } from '@/lib/types'
import { protocolToNewsItem, kungorelseToNewsItem } from '@/lib/utils'

export type RealtimeStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

// Cutoff date for kungörelser - only include from 2026-01-22 and later
const KUNGORELSE_CUTOFF_DATE = new Date('2026-01-22T00:00:00Z')

export interface RealtimeMessage {
  operation: 'INSERT' | 'UPDATE' | 'DELETE'
  type: 'protocol' | 'kungorelse'
  item?: NewsItem
  oldId?: string
}

interface UseSupabaseRealtimeOptions {
  onMessage?: (message: RealtimeMessage) => void
  onStatusChange?: (status: RealtimeStatus) => void
  enabled?: boolean
}

interface UseSupabaseRealtimeReturn {
  status: RealtimeStatus
  reconnect: () => void
  disconnect: () => void
}

/**
 * Custom hook for Supabase Realtime subscriptions
 * Subscribes to postgres_changes on ProtocolAnalysis and Kungorelser tables
 */
export function useSupabaseRealtime({
  onMessage,
  onStatusChange,
  enabled = true,
}: UseSupabaseRealtimeOptions): UseSupabaseRealtimeReturn {
  const [status, setStatus] = useState<RealtimeStatus>('disconnected')

  // Refs for cleanup and preventing race conditions
  const protocolChannelRef = useRef<RealtimeChannel | null>(null)
  const kungorelseChannelRef = useRef<RealtimeChannel | null>(null)
  const isMountedRef = useRef(true)
  const reconnectAttemptsRef = useRef(0)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Stable callback refs
  const onMessageRef = useRef(onMessage)
  const onStatusChangeRef = useRef(onStatusChange)

  // Update refs when callbacks change
  useEffect(() => {
    onMessageRef.current = onMessage
    onStatusChangeRef.current = onStatusChange
  }, [onMessage, onStatusChange])

  // Update status and notify
  const updateStatus = useCallback((newStatus: RealtimeStatus) => {
    if (!isMountedRef.current) return
    setStatus(newStatus)
    onStatusChangeRef.current?.(newStatus)
  }, [])

  // Cleanup function
  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    if (protocolChannelRef.current) {
      supabase.removeChannel(protocolChannelRef.current)
      protocolChannelRef.current = null
    }

    if (kungorelseChannelRef.current) {
      supabase.removeChannel(kungorelseChannelRef.current)
      kungorelseChannelRef.current = null
    }
  }, [])

  // Handle protocol changes
  const handleProtocolChange = useCallback((
    payload: RealtimePostgresChangesPayload<ProtocolAnalysis>
  ) => {
    if (!isMountedRef.current) return

    try {
      const eventType = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE'
      const newRecord = payload.new as ProtocolAnalysis | null
      const oldRecord = payload.old as { id?: string } | null

      const message: RealtimeMessage = {
        operation: eventType,
        type: 'protocol',
        item: newRecord ? protocolToNewsItem(newRecord) : undefined,
        oldId: oldRecord?.id,
      }

      onMessageRef.current?.(message)
    } catch (err) {
      console.error('Error processing protocol change:', err)
    }
  }, [])

  // Handle kungorelse changes
  const handleKungorelseChange = useCallback((
    payload: RealtimePostgresChangesPayload<Kungorelse>
  ) => {
    if (!isMountedRef.current) return

    try {
      const eventType = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE'
      const newRecord = payload.new as Kungorelse | null
      const oldRecord = payload.old as { id?: string } | null

      // Filter: skip kungörelser before cutoff date
      if (newRecord?.publicerad) {
        const publiceradDate = new Date(newRecord.publicerad)
        if (publiceradDate < KUNGORELSE_CUTOFF_DATE) {
          return // Skip this kungörelse
        }
      }

      const message: RealtimeMessage = {
        operation: eventType,
        type: 'kungorelse',
        item: newRecord ? kungorelseToNewsItem(newRecord) : undefined,
        oldId: oldRecord?.id,
      }

      onMessageRef.current?.(message)
    } catch (err) {
      console.error('Error processing kungorelse change:', err)
    }
  }, [])

  // Connect function
  const connect = useCallback(() => {
    if (!isMountedRef.current) return

    // Clean up existing connections first
    cleanup()

    updateStatus('connecting')

    try {
      // Subscribe to ProtocolAnalysis changes
      const protocolChannel = supabase
        .channel('protocol-realtime', {
          config: {
            broadcast: { self: false },
          },
        })
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'ProtocolAnalysis',
          },
          handleProtocolChange
        )

      // Subscribe to Kungorelser changes
      const kungorelseChannel = supabase
        .channel('kungorelse-realtime', {
          config: {
            broadcast: { self: false },
          },
        })
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'Kungorelser',
          },
          handleKungorelseChange
        )

      // Track subscription states
      let protocolSubscribed = false
      let kungorelseSubscribed = false

      const checkBothConnected = () => {
        if (protocolSubscribed && kungorelseSubscribed) {
          reconnectAttemptsRef.current = 0
          updateStatus('connected')
        }
      }

      // Subscribe to protocol channel
      protocolChannel.subscribe((status) => {
        if (!isMountedRef.current) return

        if (status === 'SUBSCRIBED') {
          protocolSubscribed = true
          checkBothConnected()
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('Protocol channel error:', status)
          handleConnectionError()
        } else if (status === 'CLOSED') {
          protocolSubscribed = false
          if (isMountedRef.current && enabled) {
            handleConnectionError()
          }
        }
      })

      // Subscribe to kungorelse channel
      kungorelseChannel.subscribe((status) => {
        if (!isMountedRef.current) return

        if (status === 'SUBSCRIBED') {
          kungorelseSubscribed = true
          checkBothConnected()
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('Kungorelse channel error:', status)
          handleConnectionError()
        } else if (status === 'CLOSED') {
          kungorelseSubscribed = false
          if (isMountedRef.current && enabled) {
            handleConnectionError()
          }
        }
      })

      protocolChannelRef.current = protocolChannel
      kungorelseChannelRef.current = kungorelseChannel

    } catch (err) {
      console.error('Failed to create Realtime channels:', err)
      handleConnectionError()
    }
  }, [cleanup, handleProtocolChange, handleKungorelseChange, updateStatus, enabled])

  // Handle connection errors with exponential backoff
  const handleConnectionError = useCallback(() => {
    if (!isMountedRef.current) return

    updateStatus('error')
    cleanup()

    // Exponential backoff: 1s, 2s, 4s, 8s, 16s, max 30s
    const maxAttempts = 10
    const baseDelay = 1000
    const maxDelay = 30000

    if (reconnectAttemptsRef.current < maxAttempts) {
      const delay = Math.min(
        baseDelay * Math.pow(2, reconnectAttemptsRef.current),
        maxDelay
      )

      reconnectAttemptsRef.current++

      reconnectTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current && enabled) {
          connect()
        }
      }, delay)
    } else {
      updateStatus('disconnected')
    }
  }, [cleanup, connect, updateStatus, enabled])

  // Manual reconnect
  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0
    connect()
  }, [connect])

  // Manual disconnect
  const disconnect = useCallback(() => {
    cleanup()
    updateStatus('disconnected')
  }, [cleanup, updateStatus])

  // Effect to manage connection lifecycle
  useEffect(() => {
    isMountedRef.current = true

    if (enabled) {
      connect()
    }

    return () => {
      isMountedRef.current = false
      cleanup()
    }
  }, [enabled, connect, cleanup])

  return {
    status,
    reconnect,
    disconnect,
  }
}

export default useSupabaseRealtime
