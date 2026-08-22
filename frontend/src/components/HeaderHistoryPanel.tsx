import { useEffect, useRef, useState } from 'react'
import { History } from 'lucide-react'
import { api } from '@/api/client'
import type { ActivityEvent } from '@/api/types'
import { fmtTime } from '@/lib/format'
import { EmptyState, Pill } from '@/components/ui/Primitives'

export function HeaderHistoryPanel() {
  const [open, setOpen] = useState(false)
  const [events, setEvents] = useState<ActivityEvent[]>([])
  const [loading, setLoading] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const load = async () => {
    setLoading(true)
    try {
      setEvents(await api.get<ActivityEvent[]>('/analytics/my-today-activities'))
    } catch {
      setEvents([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) void load()
  }, [open])

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

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        title="Today's Activity History"
        aria-label="Today's Activity History"
        className="relative rounded-xl p-2 text-ink-600 transition-colors hover:bg-slate-150"
      >
        <History className="h-5 w-5" aria-hidden />
        {events.length > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-2 w-2 rounded-full bg-flow-500" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-150 bg-white shadow-lift animate-fade-up">
          <div className="flex items-center justify-between border-b border-slate-150 px-4 py-3">
            <div>
              <p className="font-bold text-ink text-sm">Today&apos;s Activity Log</p>
              <p className="text-[11px] text-away">Real-time actions & timestamps for today</p>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
            {loading && <p className="px-4 py-6 text-center text-xs text-away">Loading activity log…</p>}
            {!loading && events.length === 0 && (
              <EmptyState
                title="No activity recorded yet"
                description="Check-ins, check-outs and status logs will appear here."
              />
            )}
            {!loading &&
              events.map((evt) => (
                <div key={evt.id} className="flex flex-col gap-1 px-4 py-3 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-ink">{evt.title}</span>
                    <Pill
                      tone={
                        evt.badge_tone === 'present'
                          ? 'bg-emerald-50 text-emerald-700'
                          : evt.badge_tone === 'leave'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-flow-50 text-flow-700'
                      }
                    >
                      {evt.category.replace('_', ' ')}
                    </Pill>
                  </div>
                  {evt.description && <p className="text-xs text-slate-600">{evt.description}</p>}
                  <span className="text-[10px] font-medium text-away">{fmtTime(evt.timestamp)}</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
