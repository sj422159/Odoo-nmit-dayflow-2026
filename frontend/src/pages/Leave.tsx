import { useCallback, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CalendarPlus, Trash2 } from 'lucide-react'
import { ApiError, api } from '@/api/client'
import type { LeaveBalance, LeaveList } from '@/api/types'
import { useLiveRefresh } from '@/context/RealtimeContext'
import { useAsync } from '@/hooks/useAsync'
import { PageHeader } from '@/components/PageHeader'
import { StatCard } from '@/components/StatCard'
import {
  Button,
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  Field,
  FormBanner,
  Input,
  Pill,
  Select,
  Skeleton,
  Textarea,
} from '@/components/ui/Primitives'
import { leaveSchema, type LeaveValues } from '@/lib/validation'
import { fmtDate, isoDate, LEAVE_STATUS_TONE, LEAVE_TYPE_LABEL, titleCase } from '@/lib/format'

export default function Leave() {
  const [banner, setBanner] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  const load = useCallback(
    () =>
      Promise.all([
        api.get<LeaveBalance>('/leave/balance/me'),
        api.get<LeaveList>('/leave/requests/me', { page_size: 50 }),
      ]),
    [],
  )
  const { data, loading, error, reload } = useAsync(load, [])
  useLiveRefresh(['leave.approved', 'leave.rejected'], reload)

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LeaveValues>({
    resolver: zodResolver(leaveSchema),
    mode: 'onBlur',
    defaultValues: { leave_type: 'PAID', start_date: isoDate(new Date()), end_date: isoDate(new Date()), remarks: '' },
  })

  const onSubmit = async (values: LeaveValues) => {
    setBanner(null)
    setOk(null)
    try {
      await api.post('/leave/requests', {
        ...values,
        remarks: values.remarks?.trim() || null,
      })
      setOk('Request filed. Your HR officer will see it right away.')
      reset({ leave_type: values.leave_type, start_date: values.start_date, end_date: values.end_date, remarks: '' })
      await reload()
    } catch (err) {
      if (err instanceof ApiError) {
        Object.entries(err.fields).forEach(([field, message]) =>
          setError(field as keyof LeaveValues, { message }),
        )
        setBanner(Object.keys(err.fields).length ? null : err.message)
      } else {
        setBanner('Something went wrong. Try again.')
      }
    }
  }

  const withdraw = async (id: number) => {
    setBanner(null)
    try {
      await api.delete(`/leave/requests/${id}`)
      await reload()
    } catch (err) {
      setBanner(err instanceof ApiError ? err.message : 'Could not withdraw that request.')
    }
  }

  if (loading && !data) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-12 w-56" />
        <Skeleton className="h-28" />
        <Skeleton className="h-96" />
      </div>
    )
  }
  if (error || !data) return <ErrorState message={error ?? 'No data came back.'} onRetry={reload} />

  const [balance, requests] = data

  return (
    <>
      <PageHeader title="Time off" description="Book leave and follow where each request stands." />

      <div className="mb-5 grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard label="Paid leave left" value={balance.paid_remaining} unit={`/ ${balance.paid_total}`} tone="flow" />
        <StatCard label="Sick leave left" value={balance.sick_remaining} unit={`/ ${balance.sick_total}`} tone="flow" />
        <StatCard label="Unpaid taken" value={balance.unpaid_used} unit="d" />
        <StatCard
          label="Awaiting approval"
          value={balance.pending_days}
          unit="d"
          tone={balance.pending_days ? 'pending' : 'default'}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[22rem_1fr] lg:items-start">
        <Card>
          <CardHeader title="Request time off" subtitle="Weekends are not counted." />
          <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 p-5">
            <FormBanner message={banner} />
            {ok && (
              <p role="status" className="rounded-xl bg-present-soft px-3.5 py-3 text-sm font-semibold text-present">
                {ok}
              </p>
            )}

            <Field label="Type" htmlFor="leave_type" error={errors.leave_type?.message} required>
              <Select id="leave_type" invalid={!!errors.leave_type} {...register('leave_type')}>
                <option value="PAID">Paid leave</option>
                <option value="SICK">Sick leave</option>
                <option value="UNPAID">Unpaid leave</option>
              </Select>
            </Field>

            <Field label="First day" htmlFor="start_date" error={errors.start_date?.message} required>
              <Input id="start_date" type="date" invalid={!!errors.start_date} {...register('start_date')} />
            </Field>

            <Field label="Last day" htmlFor="end_date" error={errors.end_date?.message} required>
              <Input id="end_date" type="date" invalid={!!errors.end_date} {...register('end_date')} />
            </Field>

            <Field label="Remarks" htmlFor="remarks" error={errors.remarks?.message} hint="Optional — helps HR decide faster.">
              <Textarea id="remarks" placeholder="Anything your HR officer should know" {...register('remarks')} />
            </Field>

            <Button type="submit" loading={isSubmitting} icon={<CalendarPlus className="h-4 w-4" />}>
              Send request
            </Button>
          </form>
        </Card>

        <Card>
          <CardHeader title="Your requests" subtitle={`${requests.total} in total`} />
          {requests.items.length === 0 ? (
            <EmptyState
              title="No requests yet"
              description="Fill in the form to book your first days off."
              icon={<CalendarPlus className="h-7 w-7" />}
            />
          ) : (
            <ul className="divide-y divide-slate-150">
              {requests.items.map((leave) => (
                <li key={leave.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-ink">{LEAVE_TYPE_LABEL[leave.leave_type]}</p>
                      <p className="mt-0.5 text-sm text-away tabular">
                        {fmtDate(leave.start_date, 'd MMM yyyy')} – {fmtDate(leave.end_date, 'd MMM yyyy')} · {leave.days} day
                        {leave.days === 1 ? '' : 's'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Pill tone={LEAVE_STATUS_TONE[leave.status]}>{titleCase(leave.status)}</Pill>
                      {leave.status === 'PENDING' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => withdraw(leave.id)}
                          icon={<Trash2 className="h-3.5 w-3.5" />}
                        >
                          Withdraw
                        </Button>
                      )}
                    </div>
                  </div>
                  {leave.remarks && <p className="mt-2 text-sm text-ink-600">{leave.remarks}</p>}
                  {leave.review_comment && (
                    <p className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-sm text-ink-600">
                      <span className="font-semibold">{leave.reviewer_name ?? 'HR'}:</span> {leave.review_comment}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  )
}
