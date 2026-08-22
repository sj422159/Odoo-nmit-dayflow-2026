import { useCallback, useState } from 'react'
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { AlertTriangle, TrendingUp } from 'lucide-react'
import { api } from '@/api/client'
import type { Forecast, IrregularityFlag, TrendPoint } from '@/api/types'
import { useLiveRefresh } from '@/context/RealtimeContext'
import { useAsync } from '@/hooks/useAsync'
import { PageHeader } from '@/components/PageHeader'
import { StatCard } from '@/components/StatCard'
import { Card, CardHeader, EmptyState, ErrorState, Pill, Select, Skeleton } from '@/components/ui/Primitives'
import { fmtDate, titleCase } from '@/lib/format'

export default function Insights() {
  const [days, setDays] = useState(30)
  const [horizon, setHorizon] = useState(7)

  const load = useCallback(
    () =>
      Promise.all([
        api.get<TrendPoint[]>('/analytics/attendance-trend', { days }),
        api.get<Forecast>('/analytics/attendance-forecast', { horizon }),
        api.get<IrregularityFlag[]>('/analytics/irregularities', { window_days: 90 }),
      ]),
    [days, horizon],
  )
  const { data, loading, error, reload } = useAsync(load, [days, horizon])
  useLiveRefresh(['attendance.updated', 'poll.tick'], reload)

  if (loading && !data) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-80" />
        <Skeleton className="h-64" />
      </div>
    )
  }
  if (error || !data) return <ErrorState message={error ?? 'No data came back.'} onRetry={reload} />

  const [trend, forecast, flags] = data

  const trendChart = trend.map((point) => ({ label: fmtDate(point.work_date, 'd MMM'), rate: point.attendance_rate }))
  const forecastChart = forecast.points.map((point) => ({
    label: fmtDate(point.work_date, 'd MMM'),
    predicted: point.predicted_attendance_rate,
    lower: point.lower_bound,
    upper: point.upper_bound,
  }))

  return (
    <>
      <PageHeader
        title="Insights"
        description="Attendance trend, a short-horizon forecast, and patterns worth a conversation."
        actions={
          <Select value={days} onChange={(e) => setDays(Number(e.target.value))} className="w-36">
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </Select>
        }
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-2">
        <StatCard
          label="Forecast model"
          value={forecast.model}
          icon={<TrendingUp className="h-4 w-4" />}
          hint={`Trained on ${forecast.trained_on_days} days`}
        />
        <StatCard
          label="Mean absolute error"
          value={forecast.mean_absolute_error !== null ? `${forecast.mean_absolute_error}%` : '—'}
          hint={forecast.note}
        />
      </div>

      <Card className="mb-5">
        <CardHeader title="Attendance rate" subtitle="Historical, credited attendance across working days" />
        <div className="h-64 px-2 py-4 sm:px-4">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={trendChart} margin={{ top: 4, right: 12, left: -18, bottom: 0 }}>
              <CartesianGrid stroke="#E9EDF4" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6B7A99' }} tickLine={false} axisLine={false} minTickGap={28} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#6B7A99' }} tickLine={false} axisLine={false} width={40} unit="%" />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: '1px solid #E9EDF4', fontSize: 12, boxShadow: '0 12px 32px -12px rgba(15,26,43,.28)' }}
                formatter={(value: number) => [`${value}%`, 'Attendance']}
              />
              <Line type="monotone" dataKey="rate" stroke="#3B4CE0" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="mb-5">
        <CardHeader
          title={`${horizon}-day forecast`}
          subtitle="Shaded band is the model's confidence interval"
          action={
            <Select value={horizon} onChange={(e) => setHorizon(Number(e.target.value))} className="w-32">
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
            </Select>
          }
        />
        <div className="h-64 px-2 py-4 sm:px-4">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={forecastChart} margin={{ top: 4, right: 12, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="bandFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#616FEE" stopOpacity={0.22} />
                  <stop offset="100%" stopColor="#616FEE" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#E9EDF4" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6B7A99' }} tickLine={false} axisLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#6B7A99' }} tickLine={false} axisLine={false} width={40} unit="%" />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: '1px solid #E9EDF4', fontSize: 12, boxShadow: '0 12px 32px -12px rgba(15,26,43,.28)' }}
              />
              <Area type="monotone" dataKey="upper" stroke="none" fill="url(#bandFill)" />
              <Area type="monotone" dataKey="lower" stroke="none" fill="#FFFFFF" />
              <Line type="monotone" dataKey="predicted" stroke="#3B4CE0" strokeWidth={2} strokeDasharray="5 4" dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <CardHeader title="Irregularity flags" subtitle="Anomaly detection over the last 90 days of attendance" />
        {flags.length === 0 ? (
          <EmptyState
            title="Nothing flagged"
            description="No employee's attendance pattern stands out as unusual right now."
            icon={<AlertTriangle className="h-7 w-7" />}
          />
        ) : (
          <ul className="divide-y divide-slate-150">
            {flags.map((flag) => (
              <li key={flag.employee_id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{flag.employee_name}</p>
                  <p className="text-sm text-away tabular">
                    {flag.employee_code} · {titleCase(flag.department)}
                  </p>
                  <p className="mt-1 text-sm text-ink-600">{flag.reason}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <div className="text-right text-sm text-away tabular">
                    <p>{flag.absence_rate}% absence</p>
                    <p>{flag.avg_late_minutes}m avg late</p>
                  </div>
                  <Pill tone="bg-pending-soft text-pending">Score {flag.anomaly_score.toFixed(2)}</Pill>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  )
}
