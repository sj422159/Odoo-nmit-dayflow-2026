import { useEffect, useRef, useState } from 'react'
import { Bell, Check } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/api/client'
import type { AppNotification } from '@/api/types'
import { useRealtime } from '@/context/RealtimeContext'
import { fmtRelative } from '@/lib/format'
import { Button, EmptyState } from '@/components/ui/Primitives'

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(false)
  const { snapshot, subscribe } = useRealtime()
  const navigate = useNavigate()
  const panelRef = useRef<HTMLDivElement>(null)

  const unread = snapshot.unread_notifications ?? items.filter((n) => !n.is_read).length

  const load = async () => {
    setLoading(true)
    try {
      setItems(await api.get<AppNotification[]>('/notifications', { limit: 12 }))
    } catch {
      /* the badge still works without the list */
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) void load()
  }, [open])

  useEffect(
    () =>
      subscribe((event) => {
        if (event.event.startsWith('leave.') || event.event.startsWith('payroll.')) {
          if (open) void load()
        }
      }),
    [subscribe, open],
  )

  useEffect(() => {
    if (!open) return
    const onClick = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const markAll = async () => {
    await api.post('/notifications/read-all')
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })))
  }

  const openItem = async (item: AppNotification) => {
    if (!item.is_read) await api.post(`/notifications/${item.id}/read`)
    setOpen(false)
    if (item.link) navigate(item.link)
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
        className="relative rounded-xl p-2 text-ink-600 transition-colors hover:bg-slate-150"
      >
        <Bell className="h-5 w-5" aria-hidden />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-absent px-1 text-[10px] font-bold text-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-150 bg-white shadow-lift animate-fade-up">
          <div className="flex items-center justify-between border-b border-slate-150 px-4 py-3">
            <p className="font-bold text-ink">Notifications</p>
            {items.some((n) => !n.is_read) && (
              <Button variant="ghost" size="sm" onClick={markAll} icon={<Check className="h-3.5 w-3.5" />}>
                Mark all read
              </Button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {loading && <p className="px-4 py-6 text-center text-sm text-away">Loading…</p>}
            {!loading && items.length === 0 && (
              <EmptyState title="Nothing new" description="Approvals and payroll changes show up here." />
            )}
            {!loading &&
              items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openItem(item)}
                  className="flex w-full gap-3 border-b border-slate-150 px-4 py-3 text-left transition-colors last:border-0 hover:bg-slate-50"
                >
                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.is_read ? 'bg-slate-300' : 'bg-flow-500'}`}
                    aria-hidden
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-ink">{item.title}</span>
                    {item.body && <span className="mt-0.5 block text-sm text-ink-600">{item.body}</span>}
                    <span className="mt-1 block text-xs text-away">{fmtRelative(item.created_at)}</span>
                  </span>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
