import type { ReactNode } from 'react'
import { cx } from '@/components/ui/Primitives'

interface Props {
  label: string
  value: ReactNode
  unit?: string
  hint?: string
  icon?: ReactNode
  action?: ReactNode
  tone?: 'default' | 'present' | 'pending' | 'absent' | 'flow'
  className?: string
}

const TONES = {
  default: 'text-ink',
  present: 'text-present',
  pending: 'text-pending',
  absent: 'text-absent',
  flow: 'text-flow-500',
}

export function StatCard({ label, value, unit, hint, icon, action, tone = 'default', className }: Props) {
  return (
    <div className={cx('rounded-2xl border border-slate-150 bg-white p-4 shadow-card sm:p-5', className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-eyebrow uppercase text-away">{label}</p>
        {icon && <span className="text-away">{icon}</span>}
      </div>
      <p className={cx('mt-2 flex items-baseline gap-1 text-3xl font-bold tracking-tight', TONES[tone])}>
        <span className="tabular">{value}</span>
        {unit && <span className="text-base font-semibold text-away">{unit}</span>}
      </p>
      {hint && <p className="mt-1 text-sm text-away">{hint}</p>}
      {action && <div className="mt-4 border-t border-slate-150 pt-3">{action}</div>}
    </div>
  )
}
