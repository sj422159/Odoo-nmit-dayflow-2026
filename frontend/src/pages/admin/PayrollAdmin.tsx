import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { PlayCircle, Wallet } from 'lucide-react'
import { ApiError, api } from '@/api/client'
import type { Payslip, StructureRow } from '@/api/types'
import { useLiveRefresh } from '@/context/RealtimeContext'
import { useAsync } from '@/hooks/useAsync'
import { PageHeader } from '@/components/PageHeader'
import {
  Button,
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  Field,
  FormBanner,
  Select,
  Skeleton,
} from '@/components/ui/Primitives'
import { fmtMoney, monthName, titleCase } from '@/lib/format'

const YEARS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)

export default function PayrollAdmin() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [runBanner, setRunBanner] = useState<string | null>(null)
  const [runOk, setRunOk] = useState<string | null>(null)
  const [running, setRunning] = useState(false)

  const loadStructures = useCallback(() => api.get<StructureRow[]>('/payroll/structures'), [])
  const { data: structures, loading: sLoading, error: sError, reload: reloadStructures } = useAsync(loadStructures, [])

  const loadPayslips = useCallback(
    () => api.get<Payslip[]>('/payroll/payslips', { year, month }),
    [year, month],
  )
  const { data: payslips, loading: pLoading, error: pError, reload: reloadPayslips } = useAsync(loadPayslips, [year, month])

  useLiveRefresh(['payroll.structure_updated', 'payroll.run_completed'], () => {
    reloadStructures()
    reloadPayslips()
  })

  const runPayroll = async () => {
    setRunBanner(null)
    setRunOk(null)
    setRunning(true)
    try {
      const result = await api.post<{ payslips_created: number; payslips_updated: number; total_net: string; currency: string }>(
        '/payroll/run',
        { year, month },
      )
      setRunOk(
        `Done — ${result.payslips_created} created, ${result.payslips_updated} updated. Total net ${fmtMoney(result.total_net, result.currency)}.`,
      )
      await reloadPayslips()
    } catch (err) {
      setRunBanner(err instanceof ApiError ? err.message : 'Could not run payroll for that period.')
    } finally {
      setRunning(false)
    }
  }

  return (
    <>
      <PageHeader title="Payroll" description="Run payroll for a period and manage salary structures." />

      <Card className="mb-5">
        <CardHeader title="Run payroll" subtitle="Recomputes payslips from recorded attendance for the chosen month." />
        <div className="flex flex-wrap items-end gap-4 p-5">
          <Field label="Year" htmlFor="run-year">
            <Select id="run-year" value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-32">
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Month" htmlFor="run-month">
            <Select id="run-month" value={month} onChange={(e) => setMonth(Number(e.target.value))} className="w-40">
              {MONTHS.map((m) => (
                <option key={m} value={m}>
                  {monthName(m)}
                </option>
              ))}
            </Select>
          </Field>
          <Button onClick={runPayroll} loading={running} icon={<PlayCircle className="h-4 w-4" />}>
            Run payroll
          </Button>
        </div>
        {(runBanner || runOk) && (
          <div className="border-t border-slate-150 px-5 py-3">
            <FormBanner message={runBanner} />
            {runOk && <p role="status" className="text-sm font-semibold text-present">{runOk}</p>}
          </div>
        )}
      </Card>

      <Card className="mb-5">
        <CardHeader title={`Payslips — ${monthName(month)} ${year}`} subtitle={`${payslips?.length ?? 0} generated`} />
        {pLoading && !payslips && <Skeleton className="m-5 h-40" />}
        {pError && (
          <div className="p-5">
            <ErrorState message={pError} onRetry={reloadPayslips} />
          </div>
        )}
        {payslips && payslips.length === 0 && (
          <EmptyState
            title="No payslips for this period"
            description="Run payroll for this month to generate them."
            icon={<Wallet className="h-7 w-7" />}
          />
        )}
        {payslips && payslips.length > 0 && (
          <ul className="divide-y divide-slate-150">
            {payslips.map((slip) => (
              <li key={slip.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{slip.employee_name}</p>
                  <p className="text-sm text-away tabular">
                    {slip.employee_code} · {slip.paid_days} paid · {slip.lop_days} unpaid
                  </p>
                </div>
                <p className="font-bold text-present tabular">{fmtMoney(slip.net_pay, slip.currency)}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader title="Salary structures" subtitle="Current structure per employee — edit from their profile." />
        {sLoading && !structures && <Skeleton className="m-5 h-40" />}
        {sError && (
          <div className="p-5">
            <ErrorState message={sError} onRetry={reloadStructures} />
          </div>
        )}
        {structures && (
          <ul className="divide-y divide-slate-150">
            {structures.map((row) => (
              <li key={row.employee_id}>
                <Link
                  to={`/admin/employees/${row.employee_id}`}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{row.full_name}</p>
                    <p className="text-sm text-away">
                      {row.employee_code} · {row.designation} · {titleCase(row.department)}
                    </p>
                  </div>
                  <p className="font-semibold text-ink tabular">
                    {row.salary ? fmtMoney(row.salary.net_monthly, row.salary.currency) + ' / mo' : 'Not set'}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  )
}
