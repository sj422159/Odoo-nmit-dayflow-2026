import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { BellRing, CalendarDays, Clock, LogIn, LogOut, Wallet } from 'lucide-react'
import { api, ApiError } from '@/api/client'
import type { AttendanceSummary, EmployeeInsights, LeaveBalance, LeaveList, MyPayroll, TodayStatus } from '@/api/types'
import { useAuth } from '@/context/AuthContext'
import { useLiveRefresh, useRealtime } from '@/context/RealtimeContext'
import { useAsync } from '@/hooks/useAsync'
import { DayRibbon } from '@/components/DayRibbon'
import { PageHeader } from '@/components/PageHeader'
import { StatCard } from '@/components/StatCard'
import {
  Button,
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  FormBanner,
  Pill,
  Skeleton,
} from '@/components/ui/Primitives'
import { fmtDate, fmtDuration, fmtMoney, fmtTime, LEAVE_STATUS_TONE, LEAVE_TYPE_LABEL, STATUS_LABEL, STATUS_TONE, titleCase } from '@/lib/format'

export default function EmployeeHome() {
  const { session } = useAuth()
  const { refresh, snapshot } = useRealtime()
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
        api.get<MyPayroll>('/payroll/me'),
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

  const [today, week, balance, leaves, _insights, payroll] = data
  const firstName = session?.full_name.split(' ')[0] ?? 'there'

  const unreadAlerts = snapshot.unread_notifications ?? 0
  const attendanceTone = today.checked_in ? (today.status === 'ABSENT' ? 'absent' : 'present') : 'pending'
  const leaveTone = balance.paid_remaining <= 0 ? 'absent' : balance.paid_remaining <= 2 ? 'pending' : 'present'

  const summaryCards: Array<{
    label: string
    value: number | string
    unit: string
    hint: string
    tone: 'present' | 'pending' | 'absent'
    icon: ReactNode
    action: ReactNode
  }> = useMemo(
    () => [
      {
        label: 'Today’s attendance',
        value: today.checked_in ? fmtDuration(today.worked_minutes) : 'Not started',
        unit: today.checked_in ? 'today' : 'check-in',
        hint: today.check_in
          ? `In at ${fmtTime(today.check_in)}${today.check_out ? ` · Out at ${fmtTime(today.check_out)}` : ' · still on shift'}`
          : 'No check-in recorded yet',
        tone: attendanceTone,
        icon: <Clock className="h-4 w-4" />,
        action: today.checked_in && !today.checked_out ? (
          <Button variant="success" className="w-full" onClick={() => clock('check-out')} loading={clocking} icon={<LogOut className="h-4 w-4" />}>
            Check out
          </Button>
        ) : (
          <Link to="/attendance" className="block">
            <Button variant="secondary" className="w-full">
              View attendance
            </Button>
          </Link>
        ),
      },
      {
        label: 'Leave balance',
        value: balance.paid_remaining,
        unit: `/${balance.paid_total} days`,
        hint:
          balance.pending_days > 0
            ? `${balance.pending_days} day(s) awaiting approval`
            : balance.paid_remaining === 0
              ? 'No paid leave left this year'
              : 'Healthy balance this cycle',
        tone: leaveTone,
        icon: <CalendarDays className="h-4 w-4" />,
        action: (
          <Link to="/leave" className="block">
            <Button variant="secondary" className="w-full">
              Manage leave
            </Button>
          </Link>
        ),
      },
      {
        label: 'Payroll summary',
        value: payroll.salary ? fmtMoney(payroll.salary.net_monthly, payroll.currency) : '—',
        unit: payroll.salary ? 'net / month' : 'salary',
        hint: payroll.salary ? `YTD ${fmtMoney(payroll.ytd_net, payroll.currency)}` : 'Salary structure pending',
        tone: payroll.salary ? 'present' : 'pending',
        icon: <CalendarDays className="h-4 w-4" />,
        action: (
          <Link to="/payroll" className="block">
            <Button variant="secondary" className="w-full">
              View payslips
            </Button>
          </Link>
        ),
      },
      {
        label: 'Alerts',
        value: unreadAlerts,
        unit: unreadAlerts === 1 ? 'new' : 'new',
        hint: unreadAlerts > 0 ? 'Review unread notices and approvals' : 'No urgent items right now',
        tone: (unreadAlerts > 0 ? 'absent' : 'present') as 'present' | 'absent',
        icon: <BellRing className="h-4 w-4" />,
        action: (
          <Link to="/dashboard" className="block">
            <Button variant="secondary" className="w-full">
              Review alerts
            </Button>
          </Link>
        ),
      },
    ],
    [attendanceTone, balance.paid_remaining, balance.paid_total, balance.pending_days, clock, clocking, payroll, today.check_in, today.check_out, today.checked_in, today.worked_minutes, unreadAlerts],
  )

  return (
    <>
      <PageHeader
        title={`Good to see you, ${firstName}`}
        description={fmtDate(today.work_date, 'EEEE, d MMMM yyyy')}
      />

      {/* Today — the clock and the day's ribbon together */}
      <Card className="mb-5 overflow-hidden">
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-eyebrow uppercase text-away">Today</p>
              {today.status && (
                <Pill tone={STATUS_TONE[today.status].chip}>{STATUS_LABEL[today.status]}</Pill>
              )}
            </div>
            <p className="mt-1.5 text-3xl font-bold tracking-tight text-ink tabular">
              {fmtDuration(today.worked_minutes)}
            </p>
            <p className="mt-0.5 text-sm text-away">
              {today.check_in
                ? `In at ${fmtTime(today.check_in)}${today.check_out ? ` · Out at ${fmtTime(today.check_out)}` : ' · still running'}`
                : 'Not checked in yet'}
            </p>
            <div className="mt-4">
              <DayRibbon
                checkIn={today.check_in}
                checkOut={today.check_out}
                status={today.status}
                workedMinutes={today.worked_minutes}
                showScale
                live
              />
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-2 sm:w-44">
            {!today.checked_in && (
              <Button onClick={() => clock('check-in')} loading={clocking} icon={<LogIn className="h-4 w-4" />}>
                Check in
              </Button>
            )}
            {today.checked_in && !today.checked_out && (
              <Button
                variant="success"
                onClick={() => clock('check-out')}
                loading={clocking}
                icon={<LogOut className="h-4 w-4" />}
              >
                Check out
              </Button>
            )}
            {today.checked_out && (
              <div className="rounded-xl bg-present-soft px-3.5 py-3 text-center">
                <p className="text-sm font-semibold text-present">Day closed</p>
                <p className="mt-0.5 text-xs text-ink-600">See you tomorrow.</p>
              </div>
            )}
            <Link to="/attendance">
              <Button variant="secondary" className="w-full">
                Attendance
              </Button>
            </Link>
          </div>
        </div>
        {clockError && (
          <div className="border-t border-slate-150 px-5 py-3">
            <FormBanner message={clockError} />
          </div>
        )}
      </Card>

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <StatCard
            key={card.label}
            label={card.label}
            value={card.value}
            unit={card.unit}
            hint={card.hint}
            icon={card.icon}
            tone={card.tone}
            action={card.action}
          />
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="This week"
            subtitle={`${fmtDate(week.range_start, 'd MMM')} – ${fmtDate(week.range_end, 'd MMM')}`}
            action={
              <Link to="/attendance" className="text-sm font-semibold text-flow-600 hover:underline">
                Full history
              </Link>
            }
          />
          <div className="flex flex-col gap-3.5 p-5">
            {week.days.map((day) => (
              <div key={day.work_date} className="flex items-center gap-3">
                <span className="w-11 shrink-0 text-xs font-semibold text-away">
                  {fmtDate(day.work_date, 'EEE')}
                </span>
                <div className="min-w-0 flex-1">
                  <DayRibbon
                    checkIn={day.check_in}
                    checkOut={day.check_out}
                    status={day.status}
                    workedMinutes={day.worked_minutes}
                  />
                </div>
                <span className="w-16 shrink-0 text-right text-xs font-semibold text-ink-600 tabular">
                  {day.worked_minutes ? fmtDuration(day.worked_minutes) : day.status ? titleCase(day.status) : '—'}
                </span>
              </div>
            ))}
            <div className="mt-1 flex items-center justify-between border-t border-slate-150 pt-3 text-sm">
              <span className="text-away">Week total</span>
              <span className="font-bold text-ink tabular">{week.total_hours}h</span>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Your time off"
            subtitle="Most recent requests"
            action={
              <Link to="/leave" className="text-sm font-semibold text-flow-600 hover:underline">
                Apply
              </Link>
            }
          />
          {leaves.items.length === 0 ? (
            <EmptyState
              title="No requests yet"
              description="When you book time off, it lands here with its approval status."
              icon={<CalendarDays className="h-7 w-7" />}
              action={
                <Link to="/leave">
                  <Button size="sm">Request time off</Button>
                </Link>
              }
            />
          ) : (
            <ul className="divide-y divide-slate-150">
              {leaves.items.map((leave) => (
                <li key={leave.id} className="flex items-start justify-between gap-3 px-5 py-3.5">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">{LEAVE_TYPE_LABEL[leave.leave_type]}</p>
                    <p className="mt-0.5 text-sm text-away tabular">
                      {fmtDate(leave.start_date, 'd MMM')} – {fmtDate(leave.end_date, 'd MMM')} · {leave.days}d
                    </p>
                  </div>
                  <Pill tone={LEAVE_STATUS_TONE[leave.status]}>{titleCase(leave.status)}</Pill>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Link to="/payroll" className="mt-5 block">
        <Card className="flex items-center justify-between p-5 transition-shadow hover:shadow-lift">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-flow-50 text-flow-600">
              <Wallet className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <p className="font-bold text-ink">Pay and payslips</p>
              <p className="text-sm text-away">Your salary breakdown and monthly slips.</p>
            </div>
          </div>
          <span className="text-sm font-semibold text-flow-600">Open</span>
        </Card>
      </Link>
    </>
  )
}
