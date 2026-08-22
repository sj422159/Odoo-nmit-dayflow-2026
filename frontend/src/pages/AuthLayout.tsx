import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { DayRibbon } from '@/components/DayRibbon'

const SAMPLE = [
  { in: '2024-01-01T08:52:00', out: '2024-01-01T17:20:00', status: 'PRESENT' as const },
  { in: '2024-01-01T09:04:00', out: '2024-01-01T17:41:00', status: 'PRESENT' as const },
  { in: null, out: null, status: 'LEAVE' as const },
  { in: '2024-01-01T09:11:00', out: '2024-01-01T13:05:00', status: 'HALF_DAY' as const },
  { in: '2024-01-01T08:47:00', out: '2024-01-01T18:02:00', status: 'PRESENT' as const },
]

interface Props {
  title: string
  subtitle: string
  children: ReactNode
  footer?: ReactNode
}

export function AuthLayout({ title, subtitle, children, footer }: Props) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[1.1fr_1fr]">
      {/* The product's own artifact — a week of day ribbons — carries the left panel. */}
      <aside className="hidden flex-col justify-between bg-ink p-10 lg:flex">
        <Link to="/" className="inline-flex items-center">
          <img src="/tecryst-logo-white.png" alt="TeCryst" className="h-9 w-auto object-contain" />
        </Link>

        <div className="max-w-md">
          <p className="text-eyebrow uppercase text-flow-300">Every workday, perfectly aligned</p>
          <h2 className="mt-3 text-4xl font-bold leading-[1.05] tracking-tight text-white">
            A week reads at a glance.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-white/60">
            Attendance, time off and pay in one place — for the person clocking in and the
            officer signing off.
          </p>

          <div className="mt-10 space-y-4">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((day, index) => (
              <div key={day} className="flex items-center gap-4">
                <span className="w-9 text-xs font-semibold text-white/40">{day}</span>
                <div className="flex-1 [&_.bg-slate-150]:bg-white/10">
                  <DayRibbon
                    checkIn={SAMPLE[index].in}
                    checkOut={SAMPLE[index].out}
                    status={SAMPLE[index].status}
                    workedMinutes={480}
                    showScale={index === 4}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-white/35">Runs entirely on your own machine.</p>
      </aside>

      <main className="flex min-h-screen items-center justify-center bg-paper px-4 py-10">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-8 inline-flex items-center lg:hidden">
            <img src="/tecryst-logo-dark.png" alt="TeCryst" className="h-8 w-auto object-contain" />
          </Link>
          <h1 className="text-display tracking-tight text-ink">{title}</h1>
          <p className="mb-7 mt-1.5 text-sm text-ink-600">{subtitle}</p>
          <div className="rounded-2xl border border-slate-150 bg-white p-6 shadow-card">{children}</div>
          {footer && <div className="mt-5 text-center">{footer}</div>}
        </div>
      </main>
    </div>
  )
}
