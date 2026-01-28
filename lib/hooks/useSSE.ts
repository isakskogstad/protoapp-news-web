'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

export type SSEStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

interface UseSSEOptions {
  url: string
  onMessage?: (data: unknown) => void
  onOpen?: () => void
  onError?: (error: Event) => void
  enabled?: boolean
  maxReconnectAttempts?: number
  baseReconnectDelay?: number
  maxReconnectDelay?: number
}

interface UseSSEReturn {
  status: SSEStatus
  reconnect: () => void
  disconnect: () => void
}

/**
 * Custom hook for Server-Sent Events with proper cleanup
 * Fixes memory leaks and race conditions
 */
export function useSSE({
  url,
  onMessage,
  onOpen,
  onError,
  enabled = true,
  maxReconnectAttempts = 10,
  baseReconnectDelay = 1000,
  maxReconnectDelay = 30000,
}: UseSSEOptions): UseSSEReturn {
  const [status, setStatus] = useState<SSEStatus>('disconnected')

  // Use refs to track connection state and prevent race conditions
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const isConnectingRef = useRef(false)
  const isMountedRef = useRef(true)

  // Stable callback refs to avoid effect dependencies
  const onMessageRef = useRef(onMessage)
  const onOpenRef = useRef(onOpen)
  const onErrorRef = useRef(onError)

  // Update refs when callbacks change
  useEffect(() => {
    onMessageRef.current = onMessage
    onOpenRef.current = onOpen
    onErrorRef.current = onError
  }, [onMessage, onOpen, onError])

  // Cleanup function
  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    isConnectingRef.current = false
  }, [])

  // Connect function
  const connect = useCallback(() => {
    // Prevent multiple simultaneous connection attempts
    if (isConnectingRef.current || eventSourceRef.current?.readyState === EventSource.OPEN) {
      return
    }

    // Check if component is still mounted
    if (!isMountedRef.current) {
      return
    }

    isConnectingRef.current = true
    setStatus('connecting')

    // Clean up any existing connection first
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }

    try {
      const eventSource = new EventSource(url)
      eventSourceRef.current = eventSource

      eventSource.onopen = () => {
        if (!isMountedRef.current) {
          eventSource.close()
          return
        }

        isConnectingRef.current = false
        reconnectAttemptsRef.current = 0
        setStatus('connected')
        onOpenRef.current?.()
      }

      eventSource.onmessage = (event) => {
        if (!isMountedRef.current) return

        try {
          const data = JSON.parse(event.data)
          onMessageRef.current?.(data)
        } catch {
          // Handle non-JSON messages
          onMessageRef.current?.(event.data)
        }
      }

      eventSource.onerror = (error) => {
        if (!isMountedRef.current) {
          eventSource.close()
          return
        }

        isConnectingRef.current = false
        setStatus('error')
        onErrorRef.current?.(error)

        // Close the connection
        eventSource.close()
        eventSourceRef.current = null

        // Attempt to reconnect with exponential backoff
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(
            baseReconnectDelay * Math.pow(2, reconnectAttemptsRef.current),
            maxReconnectDelay
          )

          reconnectAttemptsRef.current++

          reconnectTimeoutRef.current = setTimeout(() => {
            if (isMountedRef.current) {
              connect()
            }
          }, delay)
        } else {
          setStatus('disconnected')
        }
      }
    } catch (error) {
      isConnectingRef.current = false
      setStatus('error')
      console.error('Failed to create EventSource:', error)
    }
  }, [url, maxReconnectAttempts, baseReconnectDelay, maxReconnectDelay])

  // Manual reconnect
  const reconnect = useCallback(() => {
    cleanup()
    reconnectAttemptsRef.current = 0
    connect()
  }, [cleanup, connect])

  // Manual disconnect
  const disconnect = useCallback(() => {
    cleanup()
    setStatus('disconnected')
  }, [cleanup])

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

export default useSSE
