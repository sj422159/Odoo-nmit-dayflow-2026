import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Bell, CalendarDays, Clock, Check, LogIn, LogOut, Wallet } from 'lucide-react'
import { api, ApiError } from '@/api/client'
import type { AttendanceSummary, EmployeeInsights, LeaveBalance, LeaveList, TodayStatus } from '@/api/types'
import { useAuth } from '@/context/AuthContext'
import { useLiveRefresh, useRealtime } from '@/context/RealtimeContext'
import { useAsync } from '@/hooks/useAsync'
import { DayRibbon } from '@/components/DayRibbon'
import { PageHeader } from '@/components/PageHeader'
import {
  Button,
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  FormBanner,
  Skeleton,
} from '@/components/ui/Primitives'
import { fmtDate, fmtRelative, fmtTime, LEAVE_TYPE_LABEL, STATUS_LABEL } from '@/lib/format'

export default function EmployeeHome() {
  const { session } = useAuth()
  const { refresh } = useRealtime()
  const [clocking, setClocking] = useState(false)
  const [clockError, setClockError] = useState<string | null>(null)

  const load = useCallback(
    () =>
      Promise.all([
        api.get<TodayStatus>('/attendance/me/today'),
        api.get<AttendanceSummary>('/attendance/me/week'),
        api.get<LeaveBalance>('/leave/balance/me'),
        api.get<LeaveList>('/leave/requests/me', { page_size: 4 }),
        api.get<EmployeeInsights>('/analytics/me', { days: 30 }),
      ]),
    [],
  )

  const { data, loading, error, reload } = useAsync(load, [])
  useLiveRefresh(['attendance.updated', 'leave.approved', 'leave.rejected', 'payroll.structure_updated'], reload)

  const clock = async (action: 'check-in' | 'check-out') => {
    setClocking(true)
    setClockError(null)
    try {
      await api.post(`/attendance/${action}`)
      await reload()
      refresh()
    } catch (err) {
      setClockError(err instanceof ApiError ? err.message : 'That did not go through. Try again.')
    } finally {
      setClocking(false)
    }
  }

  if (loading && !data) {
    return (
      <div className="flex flex-col gap-5">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-40" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((n) => <Skeleton key={n} className="h-28" />)}
        </div>
      </div>
    )
  }
  if (error || !data) return <ErrorState message={error ?? 'No data came back.'} onRetry={reload} />

  const [today, week, balance, leaves, insights] = data
  const firstName = session?.full_name.split(' ')[0] ?? 'there'

  const hours = (minutes: number) => `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`
  const activity = [
    ...leaves.items.slice(0, 2).map((leave) => ({
      icon: leave.status === 'APPROVED' ? <Check className="h-4 w-4" /> : <CalendarDays className="h-4 w-4" />,
      title: `${LEAVE_TYPE_LABEL[leave.leave_type]} ${leave.status.toLowerCase()}`,
      time: fmtRelative(leave.created_at),
      tone: leave.status === 'APPROVED' ? 'bg-present-soft text-present' : 'bg-flow-50 text-flow-600',
    })),
    ...(today.check_in ? [{ icon: <LogIn className="h-4 w-4" />, title: `Checked in at ${fmtTime(today.check_in)}`, time: 'Today', tone: 'bg-flow-50 text-flow-600' }] : []),
  ]

  return (
    <div className="animate-fade-up">
      <PageHeader title={`Welcome back, ${firstName}`} description={fmtDate(today.work_date, 'EEEE, d MMMM yyyy')} />
      <div className="mb-7 grid gap-4 md:grid-cols-3">
        <Card className="border-0 bg-ink p-5 text-white shadow-lift"><div className="flex items-start justify-between"><div><p className="text-eyebrow uppercase text-white/50">Profile</p><p className="mt-2 text-xl font-bold">{session?.designation ?? 'Employee'}</p><p className="mt-1 text-sm text-white/60">{session?.department ?? 'Dayflow team'}</p></div><span className="grid h-9 w-9 place-items-center rounded-xl bg-flow-500"><Wallet className="h-4 w-4" /></span></div><div className="mt-5 flex items-center justify-between"><span className="text-sm text-white/60">{today.check_in ? `In at ${fmtTime(today.check_in)}` : 'Start your workday'}</span>{!today.checked_out && <Button size="sm" onClick={() => clock(today.checked_in ? 'check-out' : 'check-in')} loading={clocking} icon={today.checked_in ? <LogOut className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}>{today.checked_in ? 'Check out' : 'Check in'}</Button>}</div>{clockError && <div className="mt-3"><FormBanner message={clockError} /></div>}</Card>
        <Card className="p-5"><div className="flex items-start justify-between"><p className="text-eyebrow uppercase text-away">Weekly hours</p><Clock className="h-5 w-5 text-present" /></div><p className="mt-3 text-3xl font-bold tracking-tight text-ink tabular">{week.total_hours}<span className="text-base font-semibold text-away"> / 40 hrs</span></p><p className="mt-1 text-sm text-away">{insights.avg_daily_hours}h average per day</p><div className="mt-5 h-1.5 overflow-hidden rounded-full bg-slate-150"><div className="h-full rounded-full bg-present" style={{ width: `${Math.min((week.total_hours / 40) * 100, 100)}%` }} /></div></Card>
        <Card className="p-5"><div className="flex items-start justify-between"><p className="text-eyebrow uppercase text-away">Leave balance</p><CalendarDays className="h-5 w-5 text-flow-500" /></div><p className="mt-3 text-3xl font-bold tracking-tight text-ink tabular">{balance.paid_remaining}<span className="text-base font-semibold text-away"> days</span></p><p className="mt-1 text-sm text-away">{balance.paid_remaining} days remaining</p><Link to="/leave" className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-flow-600">Request time off <ArrowUpRight className="h-4 w-4" /></Link></Card>
      </div>
      <Card className="mb-7 overflow-hidden"><CardHeader title="A week reads at a glance." subtitle="Your attendance and time-off" action={<Link to="/attendance" className="text-sm font-semibold text-flow-600 hover:underline">Full history</Link>} /><div className="p-5 sm:p-7"><div className="flex flex-col gap-4">{week.days.map((day) => { const status = day.status ?? (day.worked_minutes ? 'PRESENT' : null); const bar = status === 'LEAVE' ? 'week-bar-leave' : status === 'HALF_DAY' ? 'bg-pending' : 'bg-present'; return <div key={day.work_date} className="grid grid-cols-[44px_1fr_68px] items-center gap-3"><span className="text-xs font-bold text-ink-600">{fmtDate(day.work_date, 'EEE')}</span><div className="h-3 overflow-hidden rounded-full bg-slate-150"><div className={`h-full rounded-full ${bar} ${day.work_date === today.work_date && status === 'PRESENT' ? 'week-bar-today' : ''}`} style={{ width: `${day.worked_minutes ? Math.min(Math.max((day.worked_minutes / 480) * 100, 3) : status ? 100 : 0}%` }} /></div><span className="text-right text-xs font-semibold text-away tabular">{day.worked_minutes ? hours(day.worked_minutes) : status ? STATUS_LABEL[status] : '—'}</span></div> })}</div><div className="ml-[56px] mt-5 flex justify-between border-t border-slate-150 pt-3 text-[10px] font-medium text-away tabular"><span>07:00</span><span>10:00</span><span>13:00</span><span>16:00</span><span>20:00</span></div><div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-away"><span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-present" />Worked</span><span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-flow-300 week-bar-leave" />Time off</span><span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-pending" />Half day</span></div></div></Card>
      <div className="grid gap-7 lg:grid-cols-[1.2fr_.8fr]"><Card><CardHeader title="Recent alerts" subtitle="The latest from your workspace" action={<Bell className="h-5 w-5 text-away" />} />{activity.length ? <ul className="divide-y divide-slate-150">{activity.map((item, index) => <li key={`${item.title}-${index}`} className="flex items-center gap-3 px-5 py-4"><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${item.tone}`}>{item.icon}</span><div className="min-w-0"><p className="truncate text-sm font-semibold text-ink">{item.title}</p><p className="mt-0.5 text-xs text-away">{item.time}</p></div></li>)}</ul> : <EmptyState title="All clear" description="Your latest activity will appear here." />}</Card><Link to="/payroll" className="block"><Card className="flex h-full items-center justify-between p-5 transition-shadow hover:shadow-lift"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-flow-50 text-flow-600"><Wallet className="h-5 w-5" /></span><div><p className="font-bold text-ink">Pay and payslips</p><p className="mt-1 text-sm text-away">Your salary breakdown and monthly slips.</p></div></div><ArrowUpRight className="h-5 w-5 text-flow-600" /></Card></Link></div>
    </div>
  )
}
