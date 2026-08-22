import { useCallback } from 'react'
import { FileText, Wallet } from 'lucide-react'
import { api } from '@/api/client'
import type { MyPayroll } from '@/api/types'
import { useLiveRefresh } from '@/context/RealtimeContext'
import { useAsync } from '@/hooks/useAsync'
import { PageHeader } from '@/components/PageHeader'
import { StatCard } from '@/components/StatCard'
import { Card, CardHeader, EmptyState, ErrorState, Skeleton } from '@/components/ui/Primitives'
import { fmtMoney, monthName } from '@/lib/format'

export default function Payroll() {
  const load = useCallback(() => api.get<MyPayroll>('/payroll/me'), [])
  const { data, loading, error, reload } = useAsync(load, [])
  useLiveRefresh(['payroll.structure_updated', 'payroll.run_completed'], reload)

  if (loading && !data) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-12 w-56" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((n) => (
            <Skeleton key={n} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }
  if (error || !data) return <ErrorState message={error ?? 'No data came back.'} onRetry={reload} />

  const { salary, payslips, ytd_net, currency } = data

  return (
    <>
      <PageHeader title="Pay and payslips" description="Your salary breakdown and monthly slips." />

      <div className="mb-5 grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Basic"
          value={salary ? fmtMoney(salary.basic, salary.currency) : '—'}
          icon={<Wallet className="h-4 w-4" />}
        />
        <StatCard label="HRA" value={salary ? fmtMoney(salary.hra, salary.currency) : '—'} />
        <StatCard
          label="Net / month"
          value={salary ? fmtMoney(salary.net_monthly, salary.currency) : '—'}
          tone="present"
        />
        <StatCard label="Net year-to-date" value={fmtMoney(ytd_net, currency)} tone="flow" />
      </div>

      {salary && (
        <Card className="mb-5">
          <CardHeader title="Current structure" subtitle={`Effective from ${salary.effective_from}`} />
          <dl className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-4">
            <div>
              <dt className="text-eyebrow uppercase text-away">Basic</dt>
              <dd className="mt-1 font-bold text-ink tabular">{fmtMoney(salary.basic, salary.currency)}</dd>
            </div>
            <div>
              <dt className="text-eyebrow uppercase text-away">HRA</dt>
              <dd className="mt-1 font-bold text-ink tabular">{fmtMoney(salary.hra, salary.currency)}</dd>
            </div>
            <div>
              <dt className="text-eyebrow uppercase text-away">Allowances</dt>
              <dd className="mt-1 font-bold text-ink tabular">{fmtMoney(salary.allowances, salary.currency)}</dd>
            </div>
            <div>
              <dt className="text-eyebrow uppercase text-away">Deductions</dt>
              <dd className="mt-1 font-bold text-absent tabular">{fmtMoney(salary.deductions, salary.currency)}</dd>
            </div>
          </dl>
        </Card>
      )}

      <Card>
        <CardHeader title="Payslips" subtitle={`${payslips.length} on file`} />
        {payslips.length === 0 ? (
          <EmptyState
            title="No payslips yet"
            description="Payslips appear here once HR runs payroll for a period you worked."
            icon={<FileText className="h-7 w-7" />}
          />
        ) : (
          <ul className="divide-y divide-slate-150">
            {payslips.map((slip) => (
              <li key={slip.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                <div className="min-w-0">
                  <p className="font-semibold text-ink">
                    {monthName(slip.period_month)} {slip.period_year}
                  </p>
                  <p className="mt-0.5 text-sm text-away tabular">
                    {slip.paid_days} paid days · {slip.lop_days} unpaid
                  </p>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-sm text-away">Gross</p>
                    <p className="font-semibold text-ink tabular">{fmtMoney(slip.gross, slip.currency)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-away">Net pay</p>
                    <p className="font-bold text-present tabular">{fmtMoney(slip.net_pay, slip.currency)}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  )
}
