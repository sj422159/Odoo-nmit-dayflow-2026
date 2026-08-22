import { useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CalendarDays, CheckCircle2, Users, Wallet } from 'lucide-react'
import { api } from '@/api/client'
import type { AdminOverview, LeaveList, LivePresence } from '@/api/types'
import { useLiveRefresh } from '@/context/RealtimeContext'
import { useAsync } from '@/hooks/useAsync'
import { PageHeader } from '@/components/PageHeader'
import { StatCard } from '@/components/StatCard'
import { Button, Card, CardHeader, EmptyState, ErrorState, Skeleton } from '@/components/ui/Primitives'
import { fmtDate, fmtMoney, fmtTime, LEAVE_TYPE_LABEL, initials, titleCase } from '@/lib/format'

export default function AdminHome() {
  const load = useCallback(
    () =>
      Promise.all([
        api.get<AdminOverview>('/analytics/overview'),
        api.get<LeaveList>('/leave/requests', { leave_status: 'PENDING', page_size: 5 }),
        api.get<LivePresence>('/analytics/live-presence'),
      ]),
    [],
  )

  const { data, loading, error, reload } = useAsync(load, [])
  useLiveRefresh(
    ['attendance.checked_in', 'attendance.checked_out', 'attendance.updated', 'leave.requested', 'leave.approved', 'leave.rejected', 'poll.tick'],
    reload,
  )

  if (loading && !data) {
    return (
      <div className="flex flex-col gap-5">
        <Skeleton className="h-12 w-72" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((n) => <Skeleton key={n} className="h-28" />)}
        </div>
        <Skeleton className="h-80" />
      </div>
    )
  }
  if (error || !data) return <ErrorState message={error ?? 'No data came back.'} onRetry={reload} />

  const [overview, pending, presence] = data
  const chart = overview.trend.map((point) => ({
    ...point,
    label: fmtDate(point.work_date, 'd MMM'),
  }))

  return (
    <>
      <PageHeader
        title="Today across the team"
        description="Live headcount, approvals waiting on you, and the last 30 days of attendance."
        actions={
          <Link to="/admin/insights">
            <Button variant="secondary" size="sm">Insights</Button>
          </Link>
        }
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Present today"
          value={overview.present_today}
          unit={`/ ${overview.active_employees}`}
          tone="present"
          icon={<Users className="h-4 w-4" />}
          hint={`${presence.currently_working.length} still checked in`}
        />
        <StatCard
          label="On leave today"
          value={overview.on_leave_today}
          icon={<CalendarDays className="h-4 w-4" />}
          tone="flow"
        />
        <StatCard
          label="Awaiting approval"
          value={overview.pending_leave_requests}
          tone={overview.pending_leave_requests > 0 ? 'pending' : 'default'}
          icon={<CheckCircle2 className="h-4 w-4" />}
          hint={overview.pending_leave_requests > 0 ? 'Needs a decision' : 'All caught up'}
        />
        <StatCard
          label="Payroll this month"
          value={fmtMoney(overview.monthly_payroll_net, overview.currency)}
          icon={<Wallet className="h-4 w-4" />}
          hint={`${overview.attendance_rate_30d}% attendance · 30 days`}
        />
      </div>

      <Card className="mb-5">
        <CardHeader title="Attendance rate" subtitle="Credited attendance across working days, last 30 days" />
        <div className="h-64 px-2 py-4 sm:px-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chart} margin={{ top: 4, right: 12, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="rateFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3B4CE0" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="#3B4CE0" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#E9EDF4" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#6B7A99' }}
                tickLine={false}
                axisLine={false}
                minTickGap={28}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: '#6B7A99' }}
                tickLine={false}
                axisLine={false}
                width={40}
                unit="%"
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: '1px solid #E9EDF4',
                  fontSize: 12,
                  boxShadow: '0 12px 32px -12px rgba(15,26,43,.28)',
                }}
                formatter={(value: number) => [`${value}%`, 'Attendance']}
              />
              <Area
                type="monotone"
                dataKey="attendance_rate"
                stroke="#3B4CE0"
                strokeWidth={2}
                fill="url(#rateFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Waiting on you"
            subtitle={pending.pending_count === 1 ? '1 request' : `${pending.pending_count} requests`}
            action={
              <Link to="/admin/leave" className="text-sm font-semibold text-flow-600 hover:underline">
                Review all
              </Link>
            }
          />
          {pending.items.length === 0 ? (
            <EmptyState
              title="Nothing pending"
              description="Every leave request has a decision. New ones appear here the moment they are filed."
              icon={<CheckCircle2 className="h-7 w-7" />}
            />
          ) : (
            <ul className="divide-y divide-slate-150">
              {pending.items.map((leave) => (
                <li key={leave.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-flow-50 text-xs font-bold text-flow-600">
                      {initials(leave.employee_name ?? '')}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">{leave.employee_name}</p>
                      <p className="text-sm text-away tabular">
                        {LEAVE_TYPE_LABEL[leave.leave_type]} · {fmtDate(leave.start_date, 'd MMM')} · {leave.days}d
                      </p>
                    </div>
                  </div>
                  <Link to="/admin/leave">
                    <Button size="sm" variant="secondary">Review</Button>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Checked in right now"
            subtitle="Updates the moment someone clocks in or out"
            action={
              <Link to="/admin/attendance" className="text-sm font-semibold text-flow-600 hover:underline">
                Attendance board
              </Link>
            }
          />
          {presence.currently_working.length === 0 ? (
            <EmptyState
              title="Nobody is clocked in"
              description="Open sessions appear here in real time as the day starts."
              icon={<Users className="h-7 w-7" />}
            />
          ) : (
            <ul className="divide-y divide-slate-150">
              {presence.currently_working.slice(0, 6).map((person) => (
                <li key={person.employee_id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="relative flex h-2 w-2 shrink-0">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-present animate-pulse-ring" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-present" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">{person.full_name}</p>
                      <p className="text-sm text-away">{person.department}</p>
                    </div>
                  </div>
                  <span className="text-sm text-away tabular">since {fmtTime(person.since)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="mt-5">
        <CardHeader title="Headcount by department" />
        <ul className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
          {overview.headcount_by_department.map((row) => {
            const share = overview.total_employees
              ? Math.round((row.headcount / overview.total_employees) * 100)
              : 0
            return (
              <li key={row.department}>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-semibold text-ink">{titleCase(row.department)}</span>
                  <span className="text-sm text-away tabular">{row.headcount}</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-150">
                  <span
                    className="block h-full origin-left rounded-full bg-flow-400 animate-ribbon-in"
                    style={{ width: `${share}%` }}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      </Card>

      <div className="mt-5 flex flex-wrap gap-2">
        <Link to="/admin/employees"><Button variant="secondary" size="sm">Manage people</Button></Link>
        <Link to="/admin/payroll"><Button variant="secondary" size="sm">Run payroll</Button></Link>
        <Link to="/admin/insights"><Button variant="secondary" size="sm">Forecast &amp; flags</Button></Link>
      </div>
    </>
  )
}
