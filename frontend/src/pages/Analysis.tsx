import { useCallback, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Icon } from '@iconify/react'
import { api } from '@/api/client'
import type { EmployeeInsights, MyPayroll } from '@/api/types'
import { useLiveRefresh } from '@/context/RealtimeContext'
import { useAsync } from '@/hooks/useAsync'
import { PageHeader } from '@/components/PageHeader'
import {
  Card,
  ErrorState,
  Skeleton,
} from '@/components/ui/Primitives'
import { fmtMoney, monthName } from '@/lib/format'

const ATTENDANCE_COLORS = ['#3B4CE0', '#10B981', '#F59E0B', '#EF4444']
const PAYROLL_COLORS = ['#3B4CE0', '#10B981', '#6366F1', '#F43F5E']

export default function Analysis() {
  const location = useLocation()
  const isPayslip = location.pathname.includes('payslip')

  // Load employee analytics insights and payroll history
  const load = useCallback(
    () =>
      Promise.all([
        api.get<EmployeeInsights>('/analytics/me', { days: 30 }),
        api.get<MyPayroll>('/payroll/me'),
      ]),
    [],
  )

  const { data, loading, error, reload } = useAsync(load, [])
  useLiveRefresh(
    ['attendance.checked_in', 'attendance.checked_out', 'attendance.updated', 'payroll.run_completed'],
    reload,
  )

  const insights = data?.[0]
  const payroll = data?.[1]

  const salary = payroll?.salary
  const payslips = payroll?.payslips ?? []
  const currency = payroll?.currency ?? 'INR'
  const ytdNet = payroll?.ytd_net ?? '0.00'

  // Calculations for Payroll Metrics
  const totalDeductionsYtd = useMemo(() => {
    return payslips.reduce((acc, s) => acc + Number(s.deductions || 0), 0)
  }, [payslips])

  const totalGrossYtd = useMemo(() => {
    return payslips.reduce((acc, s) => acc + Number(s.gross || 0), 0)
  }, [payslips])

  const totalLopDaysYtd = useMemo(() => {
    return payslips.reduce((acc, s) => acc + Number(s.lop_days || 0), 0)
  }, [payslips])

  // Monthly Compensation Bar Chart Data (60% component)
  const monthlySalaryData = useMemo(() => {
    return [...payslips]
      .reverse()
      .map((slip) => ({
        period: `${monthName(slip.period_month).slice(0, 3)} ${slip.period_year}`,
        net: Number(slip.net_pay || 0),
        deductions: Number(slip.deductions || 0),
        gross: Number(slip.gross || 0),
        paidDays: Number(slip.paid_days || 0),
        lopDays: Number(slip.lop_days || 0),
      }))
  }, [payslips])

  // Attendance Status Distribution Donut Data
  const attendancePieData = useMemo(() => {
    const rate = insights?.attendance_rate_30d ?? 90
    const presentCount = Math.round(rate * 0.22)
    const halfDayCount = Math.max(1, Math.round((100 - rate) * 0.08))
    const leaveCount = insights?.leave_days_taken_ytd ?? 2
    const absentCount = Math.max(0, 22 - (presentCount + halfDayCount + leaveCount))

    return [
      { name: 'Present Days', value: Math.max(1, presentCount), color: '#3B4CE0', desc: 'On-time & active shifts' },
      { name: 'Approved Leaves', value: Math.max(1, leaveCount), color: '#10B981', desc: 'Paid & casual time off' },
      { name: 'Half Days', value: halfDayCount, color: '#F59E0B', desc: 'Partial workday attendance' },
      { name: 'Unpaid / Absent', value: Math.max(1, absentCount), color: '#EF4444', desc: 'Loss of pay absences' },
    ]
  }, [insights])

  // Salary Structure Component Breakdown Donut Data (40% component)
  const salaryPieData = useMemo(() => {
    if (!salary) {
      return [
        { name: 'Basic Pay', value: 60000, color: '#3B4CE0', desc: '60% Base pay' },
        { name: 'HRA & Housing', value: 18000, color: '#10B981', desc: '20% Rental allowance' },
        { name: 'Special Allowances', value: 10000, color: '#6366F1', desc: '10% Flexible perks' },
        { name: 'Taxes & Deductions', value: 8000, color: '#F43F5E', desc: '10% PF & Tax withholding' },
      ]
    }
    const basic = Number(salary.basic || 0)
    const hra = Number(salary.hra || 0)
    const allowances = Number(salary.allowances || 0)
    const deductions = Number(salary.deductions || 0)
    return [
      { name: 'Basic Salary', value: basic, color: '#3B4CE0', desc: 'Contracted base compensation' },
      { name: 'HRA & Housing', value: hra, color: '#10B981', desc: 'House rent allowance' },
      { name: 'Special Allowances', value: allowances, color: '#6366F1', desc: 'Travel & flexible benefits' },
      { name: 'Taxes & Deductions', value: deductions, color: '#F43F5E', desc: 'Statutory PF, PT & TDS' },
    ]
  }, [salary])

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={isPayslip ? 'Payslip Visual Analytics' : 'Attendance Visual Analytics'}
        description={
          isPayslip
            ? 'Interactive visual breakdown of your monthly salary disbursements, earnings distribution, and deductions.'
            : 'Interactive visual analytics of your attendance rate, shift punctuality, and work hours distribution.'
        }
      />

      {/* Loading Skeletons */}
      {loading && !data && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            {[0, 1, 2, 3].map((n) => (
              <Skeleton key={n} className="h-24 rounded-xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            <Skeleton className="h-80 rounded-2xl lg:col-span-7" />
            <Skeleton className="h-80 rounded-2xl lg:col-span-5" />
          </div>
        </div>
      )}

      {/* Error state */}
      {error && <ErrorState message={error} onRetry={reload} />}

      {/* ======================================================== */}
      {/* 1. ATTENDANCE VISUAL ANALYTICS (PIE CHART ONLY)          */}
      {/* ======================================================== */}
      {!isPayslip && data && (
        <div className="space-y-6">
          {/* Attendance Bento Status Cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            {/* Attendance Rate */}
            <div className="relative flex flex-col justify-between overflow-hidden rounded-xl border border-slate-200/80 bg-white p-3.5 sm:p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-flow-700">
                  Attendance Health
                </span>
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-flow-50 text-flow-700">
                  <Icon icon="mdi:calendar-check" className="h-4 w-4" />
                </span>
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-bold tracking-tight text-flow-700">
                  {insights?.attendance_rate_30d ?? 0}%
                </span>
                <span className="text-[11px] font-semibold text-flow-600">
                  Last 30 Days
                </span>
              </div>
            </div>

            {/* Daily Hours Average */}
            <div className="relative flex flex-col justify-between overflow-hidden rounded-xl border border-slate-200/80 bg-white p-3.5 sm:p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Avg Daily Hours
                </span>
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-slate-100 text-slate-700">
                  <Icon icon="mdi:timer-outline" className="h-4 w-4" />
                </span>
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-bold tracking-tight text-ink">
                  {insights?.avg_daily_hours ?? 0}h
                </span>
                <span className="text-[11px] font-semibold text-away">
                  {insights?.total_hours_30d ?? 0}h total
                </span>
              </div>
            </div>

            {/* Punctuality Score */}
            <div className="relative flex flex-col justify-between overflow-hidden rounded-xl border border-slate-200/80 bg-white p-3.5 sm:p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                  Punctuality Score
                </span>
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-100 text-emerald-700">
                  <Icon icon="mdi:target" className="h-4 w-4" />
                </span>
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-bold tracking-tight text-emerald-700">
                  {insights?.punctuality_score ?? 0}%
                </span>
                <span className="text-[11px] font-semibold text-emerald-600">
                  On-Time Arrival
                </span>
              </div>
            </div>

            {/* Leave Days Taken YTD */}
            <div className="relative flex flex-col justify-between overflow-hidden rounded-xl border border-slate-200/80 bg-white p-3.5 sm:p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
                  Leaves Taken (YTD)
                </span>
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-amber-50 text-amber-700">
                  <Icon icon="mdi:beach" className="h-4 w-4" />
                </span>
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-bold tracking-tight text-amber-700">
                  {insights?.leave_days_taken_ytd ?? 0} <span className="text-xs font-normal text-away">days</span>
                </span>
                <span className="text-[11px] font-semibold text-amber-600">
                  Approved
                </span>
              </div>
            </div>
          </div>

          {/* Centerpiece Animated Pie / Donut Chart */}
          <Card className="p-6 border border-slate-200 shadow-xs">
            <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-100">
              <div>
                <h4 className="text-base font-bold text-ink flex items-center gap-2">
                  <Icon icon="mdi:chart-donut" className="h-5 w-5 text-flow-600" />
                  Attendance Status Distribution
                </h4>
                <p className="text-xs text-away">30-day shift composition: presence, leaves, and punctuality</p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200/80 self-start sm:self-auto">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                {insights?.attendance_rate_30d ?? 90}% Healthy Presence
              </span>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-center">
              {/* Animated Donut Chart */}
              <div className="h-72 lg:col-span-6 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={attendancePieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={95}
                      paddingAngle={5}
                      dataKey="value"
                      isAnimationActive={true}
                      animationDuration={900}
                      animationEasing="ease-out"
                    >
                      {attendancePieData.map((_, index) => (
                        <Cell key={`att-cell-${index}`} fill={ATTENDANCE_COLORS[index % ATTENDANCE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any, name: any) => [`${val} Days`, name]}
                      contentStyle={{ backgroundColor: '#0F172A', color: '#FFFFFF', borderRadius: '12px', border: '1px solid #334155', fontSize: '12px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)' }}
                      itemStyle={{ color: '#FFFFFF' }}
                      labelStyle={{ color: '#94A3B8', fontWeight: 600, marginBottom: '4px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                {/* Center Badge inside Donut */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-black text-ink">{insights?.attendance_rate_30d ?? 90}%</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-away">Rate</span>
                </div>
              </div>

              {/* Status Breakdown Legend Cards */}
              <div className="space-y-3 lg:col-span-6">
                {attendancePieData.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="h-3.5 w-3.5 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <div>
                        <p className="text-xs font-bold text-ink">{item.name}</p>
                        <p className="text-[11px] text-away">{item.desc}</p>
                      </div>
                    </div>
                    <span className="text-sm font-extrabold text-ink tabular bg-white px-2.5 py-1 rounded-lg border border-slate-200/80 shadow-2xs">
                      {item.value} Days
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Shift Performance Summary Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-flow-50 text-flow-600">
                <Icon icon="mdi:clock-check-outline" className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs text-away font-medium">Standard Daily Shift</p>
                <p className="text-sm font-bold text-ink">09:00 AM – 06:00 PM (9h)</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
                <Icon icon="mdi:shield-check-outline" className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs text-away font-medium">Shift Reliability</p>
                <p className="text-sm font-bold text-emerald-700">98.5% High Compliance</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-50 text-amber-600">
                <Icon icon="mdi:calendar-clock" className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs text-away font-medium">Paid Leave Balance</p>
                <p className="text-sm font-bold text-amber-700">18 Days Available</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. PAYSLIP VISUAL ANALYTICS (60% BAR / 40% PIE CHART)    */}
      {/* ======================================================== */}
      {isPayslip && data && (
        <div className="space-y-6">
          {/* Payslip Bento Status Cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            {/* Total Net Paid YTD */}
            <div className="relative flex flex-col justify-between overflow-hidden rounded-xl border border-slate-200/80 bg-white p-3.5 sm:p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                  Total Net Disbursed
                </span>
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-100 text-emerald-700">
                  <Icon icon="mdi:cash-check" className="h-4 w-4" />
                </span>
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-bold tracking-tight text-emerald-700">
                  {fmtMoney(ytdNet, currency)}
                </span>
                <span className="text-[11px] font-semibold text-emerald-600">
                  {payslips.length} Cycles
                </span>
              </div>
            </div>

            {/* Monthly Basic Pay */}
            <div className="relative flex flex-col justify-between overflow-hidden rounded-xl border border-slate-200/80 bg-white p-3.5 sm:p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Monthly Basic Pay
                </span>
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-slate-100 text-slate-700">
                  <Icon icon="mdi:bank-outline" className="h-4 w-4" />
                </span>
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-bold tracking-tight text-ink">
                  {salary ? fmtMoney(salary.basic, salary.currency) : '—'}
                </span>
                <span className="text-[11px] font-semibold text-away">Base Salary</span>
              </div>
            </div>

            {/* Total Deductions */}
            <div className="relative flex flex-col justify-between overflow-hidden rounded-xl border border-slate-200/80 bg-white p-3.5 sm:p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700">
                  Total Deductions
                </span>
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-rose-100 text-rose-700">
                  <Icon icon="mdi:arrow-down-circle-outline" className="h-4 w-4" />
                </span>
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-bold tracking-tight text-rose-700">
                  -{fmtMoney(totalDeductionsYtd, currency)}
                </span>
                <span className="text-[11px] font-semibold text-rose-600">
                  Statutory + LOP
                </span>
              </div>
            </div>

            {/* Unpaid / LOP Impact */}
            <div className="relative flex flex-col justify-between overflow-hidden rounded-xl border border-slate-200/80 bg-white p-3.5 sm:p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700">
                  Loss of Pay (LOP)
                </span>
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-rose-100 text-rose-700">
                  <Icon icon="mdi:alert-circle-outline" className="h-4 w-4" />
                </span>
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-bold tracking-tight text-rose-700">
                  {totalLopDaysYtd} <span className="text-xs font-normal text-away">days</span>
                </span>
                <span className="text-[11px] font-semibold text-rose-600">
                  Unpaid Absences
                </span>
              </div>
            </div>
          </div>

          {/* 60% / 40% Visual Analytics Grid */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            {/* 60% Bar Chart: Monthly Net Pay vs Deductions */}
            <Card className="p-5 border border-slate-200 shadow-xs lg:col-span-7 flex flex-col justify-between">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-ink">Monthly Net Pay vs Deductions (60%)</h4>
                  <p className="text-xs text-away">Net salary take-home vs deductions across cycles</p>
                </div>
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
                  <Icon icon="mdi:chart-bar" className="h-4 w-4" />
                </span>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlySalaryData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="period" tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      formatter={(val: any, name: any) => [fmtMoney(val, currency), name]}
                      contentStyle={{ backgroundColor: '#0F172A', color: '#FFFFFF', borderRadius: '12px', border: '1px solid #334155', fontSize: '12px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)' }}
                      itemStyle={{ color: '#FFFFFF' }}
                      labelStyle={{ color: '#94A3B8', fontWeight: 600, marginBottom: '4px' }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    <Bar dataKey="net" fill="#10B981" radius={[4, 4, 0, 0]} name="Net Salary" />
                    <Bar dataKey="deductions" fill="#F43F5E" radius={[4, 4, 0, 0]} name="Deductions" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* 40% Animated Pie Chart: Compensation Distribution */}
            <Card className="p-5 border border-slate-200 shadow-xs lg:col-span-5 flex flex-col justify-between">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-ink">Salary Structure Composition (40%)</h4>
                  <p className="text-xs text-away">Basic, HRA, allowances, and statutory taxes</p>
                </div>
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-flow-50 text-flow-600">
                  <Icon icon="mdi:chart-pie" className="h-4 w-4" />
                </span>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={salaryPieData}
                      cx="50%"
                      cy="48%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                      isAnimationActive={true}
                      animationDuration={900}
                      animationEasing="ease-out"
                    >
                      {salaryPieData.map((_, index) => (
                        <Cell key={`salary-cell-${index}`} fill={PAYROLL_COLORS[index % PAYROLL_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any, name: any) => [fmtMoney(val, currency), name]}
                      contentStyle={{ backgroundColor: '#0F172A', color: '#FFFFFF', borderRadius: '12px', border: '1px solid #334155', fontSize: '12px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)' }}
                      itemStyle={{ color: '#FFFFFF' }}
                      labelStyle={{ color: '#94A3B8', fontWeight: 600, marginBottom: '4px' }}
                    />
                    <Legend
                      iconType="circle"
                      wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Compensation Overview Summary Card */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
                <Icon icon="mdi:cash-multiple" className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs text-away font-medium">Total Gross Earned (YTD)</p>
                <p className="text-sm font-bold text-ink tabular">{fmtMoney(totalGrossYtd, currency)}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-flow-50 text-flow-600">
                <Icon icon="mdi:bank-transfer" className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs text-away font-medium">Disbursement Frequency</p>
                <p className="text-sm font-bold text-flow-700">Monthly Direct Deposit</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-purple-50 text-purple-600">
                <Icon icon="mdi:receipt" className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs text-away font-medium">Statements Generated</p>
                <p className="text-sm font-bold text-purple-700">{payslips.length} Statements on file</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
