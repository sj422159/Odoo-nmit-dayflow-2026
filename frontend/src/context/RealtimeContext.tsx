import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { api, socketUrl } from '@/api/client'
import { useAuth } from '@/context/AuthContext'

export interface LiveEvent {
  event: string
  payload: Record<string, unknown>
  emitted_at?: string
}

export interface LiveSnapshot {
  unread_notifications?: number
  present_today?: number
  on_leave_today?: number
  pending_leave_requests?: number
  currently_working?: number
  server_time?: string
  today?: {
    checked_in: boolean
    checked_out: boolean
    worked_minutes: number
    status: string | null
  }
}

type Status = 'connecting' | 'live' | 'polling' | 'offline'

interface RealtimeValue {
  status: Status
  snapshot: LiveSnapshot
  lastEvent: LiveEvent | null
  /** Subscribe to server events; returns an unsubscribe function. */
  subscribe: (handler: (event: LiveEvent) => void) => () => void
  refresh: () => void
}

const RealtimeContext = createContext<RealtimeValue | null>(null)

const POLL_INTERVAL = 15000
const MAX_BACKOFF = 15000

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const [status, setStatus] = useState<Status>('connecting')
  const [snapshot, setSnapshot] = useState<LiveSnapshot>({})
  const [lastEvent, setLastEvent] = useState<LiveEvent | null>(null)

  const socketRef = useRef<WebSocket | null>(null)
  const pollRef = useRef<number | null>(null)
  const retryRef = useRef<number | null>(null)
  const attemptRef = useRef(0)
  const handlersRef = useRef(new Set<(event: LiveEvent) => void>())
  const closedByUs = useRef(false)

  const emit = useCallback((event: LiveEvent) => {
    setLastEvent(event)
    handlersRef.current.forEach((handler) => handler(event))
  }, [])

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      window.clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  /** Fallback path: when the socket cannot hold, poll the same state over HTTP. */
  const startPolling = useCallback(() => {
    if (pollRef.current) return
    const tick = async () => {
      try {
        const [counts, presence] = await Promise.all([
          api.get<{ unread: number }>('/notifications/unread-count'),
          api.get<{ currently_working: unknown[] }>('/analytics/live-presence'),
        ])
        setSnapshot((prev) => ({
          ...prev,
          unread_notifications: counts.unread,
          currently_working: presence.currently_working.length,
        }))
        setStatus('polling')
        emit({ event: 'poll.tick', payload: {} })
      } catch {
        setStatus('offline')
      }
    }
    void tick()
    pollRef.current = window.setInterval(tick, POLL_INTERVAL)
  }, [emit])

  const connect = useCallback(() => {
    const url = socketUrl()
    if (!url) return
    closedByUs.current = false
    setStatus('connecting')

    let socket: WebSocket
    try {
      socket = new WebSocket(url)
    } catch {
      startPolling()
      return
    }
    socketRef.current = socket

    socket.onopen = () => {
      attemptRef.current = 0
      stopPolling()
      setStatus('live')
    }

    socket.onmessage = (message) => {
      try {
        const data = JSON.parse(message.data) as LiveEvent
        if (data.event === 'connected' || data.event === 'snapshot') {
          setSnapshot((prev) => ({ ...prev, ...(data.payload as LiveSnapshot) }))
        }
        emit(data)
      } catch {
        /* ignore malformed frames */
      }
    }

    socket.onerror = () => socket.close()

    socket.onclose = () => {
      socketRef.current = null
      if (closedByUs.current) return
      attemptRef.current += 1
      // After two failed attempts, fall back to polling and keep retrying quietly.
      if (attemptRef.current >= 2) startPolling()
      const delay = Math.min(1000 * 2 ** attemptRef.current, MAX_BACKOFF)
      retryRef.current = window.setTimeout(connect, delay)
    }
  }, [emit, startPolling, stopPolling])

  useEffect(() => {
    if (!session) {
      closedByUs.current = true
      socketRef.current?.close()
      socketRef.current = null
      stopPolling()
      setStatus('offline')
      setSnapshot({})
      return
    }
    connect()
    return () => {
      closedByUs.current = true
      if (retryRef.current) window.clearTimeout(retryRef.current)
      socketRef.current?.close()
      socketRef.current = null
      stopPolling()
    }
  }, [session, connect, stopPolling])

  // Reconnect promptly when the tab comes back to the foreground.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible' || !session) return
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ action: 'refresh' }))
      } else {
        attemptRef.current = 0
        connect()
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [session, connect])

  const subscribe = useCallback((handler: (event: LiveEvent) => void) => {
    handlersRef.current.add(handler)
    return () => {
      handlersRef.current.delete(handler)
    }
  }, [])

  const refresh = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ action: 'refresh' }))
    }
  }, [])

  const value = useMemo<RealtimeValue>(
    () => ({ status, snapshot, lastEvent, subscribe, refresh }),
    [status, snapshot, lastEvent, subscribe, refresh],
  )

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>
}

export function useRealtime(): RealtimeValue {
  const ctx = useContext(RealtimeContext)
  if (!ctx) throw new Error('useRealtime must be used inside RealtimeProvider')
  return ctx
}

/** Re-run a loader whenever one of the named events arrives. */
export function useLiveRefresh(events: string[], onEvent: () => void) {
  const { subscribe } = useRealtime()
  const handler = useRef(onEvent)
  handler.current = onEvent

  useEffect(() => {
    return subscribe((event) => {
      if (events.includes(event.event)) handler.current()
    })
  }, [subscribe, events.join('|')]) // eslint-disable-line react-hooks/exhaustive-deps
}
