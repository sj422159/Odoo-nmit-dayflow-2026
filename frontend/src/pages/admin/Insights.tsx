import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  ArrowRight,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react'
import { api } from '@/api/client'
import type { AdminOverview, Forecast, IrregularityFlag, TrendPoint } from '@/api/types'
import { useLiveRefresh } from '@/context/RealtimeContext'
import { useAsync } from '@/hooks/useAsync'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardHeader, EmptyState, ErrorState, Pill, Select, Skeleton } from '@/components/ui/Primitives'
import { fmtDate, fmtMoney, titleCase } from '@/lib/format'

export default function AdminInsights() {
  const navigate = useNavigate()
  const [days, setDays] = useState(30)
  const [horizon, setHorizon] = useState(7)

  const load = useCallback(
    () =>
      Promise.all([
        api.get<AdminOverview>('/analytics/overview'),
        api.get<TrendPoint[]>('/analytics/attendance-trend', { days }),
        api.get<Forecast>('/analytics/attendance-forecast', { horizon }),
        api.get<IrregularityFlag[]>('/analytics/irregularities', { window_days: 90 }),
      ]),
    [days, horizon],
  )

  const { data, loading, error, reload } = useAsync(load, [days, horizon])
  useLiveRefresh(['attendance.updated', 'leave.created', 'leave.approved', 'leave.rejected', 'poll.tick'], reload)

  if (loading && !data) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((n) => (
            <Skeleton key={n} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-80" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (error || !data) return <ErrorState message={error ?? 'Unable to load HR dashboard.'} onRetry={reload} />

  const [overview, trend, forecast, flags] = data

  const presentRate = overview.attendance_rate_30d
  const getAttendanceCondition = (rate: number) => {
    if (rate >= 85) {
      return {
        label: 'Optimal',
        color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
        badgeColor: 'bg-emerald-500/15 text-emerald-700',
        icon: <TrendingUp className="h-4 w-4 text-emerald-600" />,
        message: 'High organization attendance & engagement.',
      }
    }
    if (rate >= 70) {
      return {
        label: 'Moderate',
        color: 'text-amber-700 bg-amber-50 border-amber-200',
        badgeColor: 'bg-amber-500/15 text-amber-700',
        icon: <TrendingUp className="h-4 w-4 text-amber-600" />,
        message: 'Average attendance level. Monitor absences.',
      }
    }
    return {
      label: 'Attention Needed',
      color: 'text-rose-700 bg-rose-50 border-rose-200',
      badgeColor: 'bg-rose-500/15 text-rose-700',
      icon: <TrendingDown className="h-4 w-4 text-rose-600" />,
      message: 'Low attendance rate detected across teams.',
    }
  }

  const attendanceCond = getAttendanceCondition(presentRate)

  const trendChartData = trend.map((p) => ({
    date: fmtDate(p.work_date, 'd MMM'),
    Present: p.present,
    Absent: p.absent,
    Leave: p.leave,
    Rate: p.attendance_rate,
  }))

  const deptData = overview.headcount_by_department.map((d) => ({
    department: d.department,
    Employees: d.headcount,
  }))

  const forecastChartData = forecast.points.map((p) => ({
    date: fmtDate(p.work_date, 'd MMM'),
    Predicted: p.predicted_attendance_rate,
    Lower: p.lower_bound,
    Upper: p.upper_bound,
  }))

  return (
    <>
      <PageHeader
        title="HR Dashboard"
        description="Real-time organizational analytics, attendance trends, and key HR workforce stats."
        actions={
          <div className="flex items-center gap-2">
            <Select value={days} onChange={(e) => setDays(Number(e.target.value))} className="w-36">
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </Select>
          </div>
        }
      />

      {/* Condition Banner */}
      <div className={`mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 shadow-sm transition-all ${attendanceCond.color}`}>
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/80 shadow-sm backdrop-blur">
            {attendanceCond.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold">30-Day Attendance Status:</span>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${attendanceCond.badgeColor}`}>
                {attendanceCond.label} ({presentRate}%)
              </span>
            </div>
            <p className="text-xs opacity-90">{attendanceCond.message}</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/admin/attendance')}
          className="inline-flex items-center gap-1.5 rounded-lg bg-white/90 px-3 py-1.5 text-xs font-semibold text-ink shadow-sm transition hover:bg-white"
        >
          View Attendance Board <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Interactive Stat Cards Grid */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Employees */}
        <div
          onClick={() => navigate('/admin/employees')}
          className="group relative cursor-pointer overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-flow-300 hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-away">Total Employees</span>
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-flow-50 text-flow-600 transition group-hover:bg-flow-500 group-hover:text-white">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-ink">{overview.total_employees}</span>
            <span className="text-xs font-medium text-emerald-600">{overview.active_employees} Active</span>
          </div>
          <p className="mt-2 flex items-center gap-1 text-xs font-medium text-flow-600 opacity-0 transition group-hover:opacity-100">
            Manage People <ArrowRight className="h-3 w-3" />
          </p>
        </div>

        {/* Present Today */}
        <div
          onClick={() => navigate('/admin/attendance')}
          className="group relative cursor-pointer overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-away">Present Today</span>
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-50 text-emerald-600 transition group-hover:bg-emerald-500 group-hover:text-white">
              <CalendarCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-ink">{overview.present_today}</span>
            <span className="text-xs font-semibold text-emerald-600">
              {overview.total_employees > 0 ? Math.round((overview.present_today / overview.total_employees) * 100) : 0}% Present
            </span>
          </div>
          <p className="mt-2 flex items-center gap-1 text-xs font-medium text-emerald-600 opacity-0 transition group-hover:opacity-100">
            View Today's Log <ArrowRight className="h-3 w-3" />
          </p>
        </div>

        {/* Pending Leave Requests */}
        <div
          onClick={() => navigate('/admin/leave')}
          className="group relative cursor-pointer overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-away">Pending Approvals</span>
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-amber-50 text-amber-600 transition group-hover:bg-amber-500 group-hover:text-white">
              <CalendarDays className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-ink">{overview.pending_leave_requests}</span>
            {overview.pending_leave_requests > 0 ? (
              <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800 animate-pulse">
                Needs Action
              </span>
            ) : (
              <span className="text-xs font-medium text-slate-500">All Clear</span>
            )}
          </div>
          <p className="mt-2 flex items-center gap-1 text-xs font-medium text-amber-600 opacity-0 transition group-hover:opacity-100">
            Review Approvals <ArrowRight className="h-3 w-3" />
          </p>
        </div>

        {/* Monthly Payroll Estimate */}
        <div
          onClick={() => navigate('/admin/payroll')}
          className="group relative cursor-pointer overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-away">Monthly Payroll</span>
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-50 text-indigo-600 transition group-hover:bg-indigo-500 group-hover:text-white">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-xl font-bold tracking-tight text-ink">
              {fmtMoney(overview.monthly_payroll_net, overview.currency)}
            </span>
          </div>
          <p className="mt-2 flex items-center gap-1 text-xs font-medium text-indigo-600 opacity-0 transition group-hover:opacity-100">
            Open Payroll Run <ArrowRight className="h-3 w-3" />
          </p>
        </div>
      </div>

      {/* Main Line Chart: Present vs Absent vs Leave Date Trend */}
      <Card className="mb-6">
        <CardHeader
          title="Daily Attendance & Absence Trend"
          subtitle={`Detailed daily breakdown of Present, Absent, and Leave counts (${days} days)`}
          action={
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span> Present
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs text-rose-600 font-medium">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500"></span> Absent
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs text-purple-600 font-medium">
                <span className="h-2.5 w-2.5 rounded-full bg-purple-500"></span> Leave
              </span>
            </div>
          }
        />
        <div className="h-72 px-2 py-4 sm:px-4">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={trendChartData} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
              <CartesianGrid stroke="#E9EDF4" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6B7A99' }} tickLine={false} axisLine={false} minTickGap={24} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#6B7A99' }} tickLine={false} axisLine={false} width={30} />
              <Tooltip
                contentStyle={{ borderRadius: 14, border: '1px solid #E9EDF4', fontSize: 12, boxShadow: '0 12px 32px -12px rgba(15,26,43,.28)' }}
              />
              <Legend verticalAlign="top" height={36} />
              <Line type="monotone" dataKey="Present" stroke="#10B981" strokeWidth={2.5} dot={{ r: 3, fill: '#10B981' }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="Absent" stroke="#F43F5E" strokeWidth={2} dot={{ r: 3, fill: '#F43F5E' }} />
              <Line type="monotone" dataKey="Leave" stroke="#8B5CF6" strokeWidth={2} dot={{ r: 3, fill: '#8B5CF6' }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Grid: Department Headcount & Short-horizon Forecast */}
      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        {/* Department Headcount Bar Chart */}
        <Card>
          <CardHeader
            title="Headcount by Department"
            subtitle="Click on any department bar to filter employees"
          />
          <div className="h-64 px-2 py-4 sm:px-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={deptData}
                margin={{ top: 10, right: 16, left: -10, bottom: 0 }}
                onClick={(e) => {
                  if (e && e.activePayload && e.activePayload[0]) {
                    const dept = e.activePayload[0].payload.department
                    navigate(`/admin/employees?department=${encodeURIComponent(dept)}`)
                  }
                }}
              >
                <CartesianGrid stroke="#E9EDF4" vertical={false} />
                <XAxis dataKey="department" tick={{ fontSize: 11, fill: '#6B7A99' }} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#6B7A99' }} tickLine={false} axisLine={false} width={30} />
                <Tooltip
                  cursor={{ fill: 'rgba(59, 76, 224, 0.05)' }}
                  contentStyle={{ borderRadius: 12, border: '1px solid #E9EDF4', fontSize: 12 }}
                />
                <Bar dataKey="Employees" fill="#3B4CE0" radius={[6, 6, 0, 0]} className="cursor-pointer transition hover:opacity-85" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Attendance Forecast Chart */}
        <Card>
          <CardHeader
            title={`${horizon}-Day Attendance Forecast`}
            subtitle="Machine learning projections based on historical working patterns"
            action={
              <Select value={horizon} onChange={(e) => setHorizon(Number(e.target.value))} className="w-28">
                <option value={7}>7 days</option>
                <option value={14}>14 days</option>
              </Select>
            }
          />
          <div className="h-64 px-2 py-4 sm:px-4">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={forecastChartData} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="bandFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B4CE0" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#3B4CE0" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#E9EDF4" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6B7A99' }} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#6B7A99' }} tickLine={false} axisLine={false} width={36} unit="%" />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E9EDF4', fontSize: 12 }} />
                <Area type="monotone" dataKey="Upper" stroke="none" fill="url(#bandFill)" />
                <Area type="monotone" dataKey="Lower" stroke="none" fill="#FFFFFF" />
                <Line type="monotone" dataKey="Predicted" stroke="#3B4CE0" strokeWidth={2.5} strokeDasharray="5 4" dot={{ r: 4, fill: '#3B4CE0' }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Irregularity Flags */}
      <Card>
        <CardHeader
          title="Attendance Anomaly Flags"
          subtitle="Employees with unusual attendance or tardiness patterns over the last 90 days"
        />
        {flags.length === 0 ? (
          <EmptyState
            title="Optimal Attendance Health"
            description="No employee attendance pattern currently triggers anomaly threshold flags."
            icon={<CheckCircle2 className="h-8 w-8 text-emerald-500" />}
          />
        ) : (
          <ul className="divide-y divide-slate-150">
            {flags.map((flag) => (
              <li
                key={flag.employee_id}
                onClick={() => navigate(`/admin/employees/${flag.employee_id}`)}
                className="group flex cursor-pointer flex-wrap items-center justify-between gap-3 px-5 py-4 transition hover:bg-slate-50/80"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-ink group-hover:text-flow-600">{flag.employee_name}</p>
                    <span className="text-xs text-away">({flag.employee_code})</span>
                  </div>
                  <p className="text-xs text-away">{titleCase(flag.department)}</p>
                  <p className="mt-1 text-sm text-ink-600">{flag.reason}</p>
                </div>
                <div className="flex shrink-0 items-center gap-4">
                  <div className="text-right text-xs text-away tabular">
                    <p className="font-semibold text-rose-600">{flag.absence_rate}% absence</p>
                    <p>{flag.avg_late_minutes}m avg late</p>
                  </div>
                  <Pill tone="bg-amber-50 text-amber-700 border-amber-200">
                    Anomaly Score {flag.anomaly_score.toFixed(2)}
                  </Pill>
                  <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-flow-600 transition" />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  )
}
