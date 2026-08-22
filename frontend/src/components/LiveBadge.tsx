import { useRealtime } from '@/context/RealtimeContext'
import { cx } from '@/components/ui/Primitives'

const COPY = {
  live: { text: 'Live', tone: 'text-present', dot: 'bg-present', title: 'Streaming updates over the live connection' },
  polling: { text: 'Refreshing', tone: 'text-pending', dot: 'bg-pending', title: 'Live connection unavailable — checking every 15 seconds' },
  connecting: { text: 'Connecting', tone: 'text-away', dot: 'bg-away', title: 'Opening the live connection' },
  offline: { text: 'Offline', tone: 'text-absent', dot: 'bg-absent', title: 'No connection to the server' },
} as const

export function LiveBadge({ className }: { className?: string }) {
  const { status } = useRealtime()
  const copy = COPY[status]

  return (
    <span
      title={copy.title}
      className={cx('inline-flex items-center gap-1.5 text-xs font-semibold', copy.tone, className)}
    >
      <span className="relative flex h-2 w-2">
        {status === 'live' && (
          <span className={cx('absolute inline-flex h-full w-full rounded-full animate-pulse-ring', copy.dot)} />
        )}
        <span className={cx('relative inline-flex h-2 w-2 rounded-full', copy.dot)} />
      </span>
      {copy.text}
    </span>
  )
}
