import { useCallback, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { type ColumnDef } from '@tanstack/react-table'
import { Icon } from '@iconify/react'
import { ApiError, api } from '@/api/client'
import type { LeaveBalance, LeaveList, LeaveRequest } from '@/api/types'
import { useLiveRefresh } from '@/context/RealtimeContext'
import { useAsync } from '@/hooks/useAsync'
import { PageHeader } from '@/components/PageHeader'
import {
  Button,
  ErrorState,
  Field,
  FormBanner,
  Input,
  Select,
  Skeleton,
  Textarea,
} from '@/components/ui/Primitives'
import { DataTable } from '@/components/ui/DataTable'
import { leaveSchema, type LeaveValues } from '@/lib/validation'
import { fmtDate, isoDate, LEAVE_STATUS_TONE, LEAVE_TYPE_LABEL, titleCase } from '@/lib/format'

export default function Leave() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [banner, setBanner] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [typeFilter, setTypeFilter] = useState<string>('ALL')
  const [withdrawingId, setWithdrawingId] = useState<number | null>(null)

  const load = useCallback(
    () =>
      Promise.all([
        api.get<LeaveBalance>('/leave/balance/me'),
        api.get<LeaveList>('/leave/requests/me', { page_size: 100 }),
      ]),
    [],
  )
  const { data, loading, error, reload } = useAsync(load, [])
  useLiveRefresh(['leave.approved', 'leave.rejected'], reload)

  const balance = data?.[0]
  const requests = data?.[1]

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LeaveValues>({
    resolver: zodResolver(leaveSchema),
    mode: 'onBlur',
    defaultValues: {
      leave_type: 'PAID',
      start_date: isoDate(new Date()),
      end_date: isoDate(new Date()),
      remarks: '',
    },
  })

  const startDateVal = watch('start_date')
  const endDateVal = watch('end_date')

  const computedDays = useMemo(() => {
    if (!startDateVal || !endDateVal) return 0
    const start = new Date(startDateVal)
    const end = new Date(endDateVal)
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return 0
    let days = 0
    const cur = new Date(start)
    while (cur <= end) {
      const dayOfWeek = cur.getDay()
      if (dayOfWeek !== 0 && dayOfWeek !== 6) days++
      cur.setDate(cur.getDate() + 1)
    }
    return days
  }, [startDateVal, endDateVal])

  const onSubmit = async (values: LeaveValues) => {
    setBanner(null)
    setOk(null)
    try {
      await api.post('/leave/requests', {
        ...values,
        remarks: values.remarks?.trim() || null,
      })
      setOk('Leave request submitted successfully. Your HR officer will review it.')
      reset({
        leave_type: values.leave_type,
        start_date: values.start_date,
        end_date: values.end_date,
        remarks: '',
      })
      setIsModalOpen(false)
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
    setWithdrawingId(id)
    try {
      await api.delete(`/leave/requests/${id}`)
      setOk('Leave request withdrawn.')
      await reload()
    } catch (err) {
      setBanner(err instanceof ApiError ? err.message : 'Could not withdraw that request.')
    } finally {
      setWithdrawingId(null)
    }
  }

  // Filtered requests
  const filteredRequests = useMemo(() => {
    return (requests?.items ?? []).filter((req) => {
      if (statusFilter !== 'ALL' && req.status !== statusFilter) return false
      if (typeFilter !== 'ALL' && req.leave_type !== typeFilter) return false
      if (!search.trim()) return true
      const q = search.toLowerCase()
      const remarks = req.remarks || ''
      const type = req.leave_type || ''
      return remarks.toLowerCase().includes(q) || type.toLowerCase().includes(q)
    })
  }, [requests?.items, statusFilter, typeFilter, search])

  // Counts for Bento Cards
  const pendingCount = requests?.items.filter((r) => r.status === 'PENDING').length ?? 0
  const approvedCount = requests?.items.filter((r) => r.status === 'APPROVED').length ?? 0
  const totalDaysTaken =
    requests?.items
      .filter((r) => r.status === 'APPROVED')
      .reduce((sum, r) => sum + Number(r.days || 0), 0) ?? 0

  // TanStack DataTable Columns
  const columns = useMemo<ColumnDef<LeaveRequest>[]>(
    () => [
      {
        accessorKey: 'leave_type',
        header: 'Leave Type',
        cell: ({ row }) => {
          const type = row.original.leave_type
          let bgTone = 'bg-slate-100 text-slate-700 border-slate-200'
          if (type === 'PAID') bgTone = 'bg-blue-50 text-blue-700 border-blue-200/80'
          if (type === 'SICK') bgTone = 'bg-amber-50 text-amber-700 border-amber-200/80'
          if (type === 'UNPAID') bgTone = 'bg-purple-50 text-purple-700 border-purple-200/80'

          return (
            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border ${bgTone}`}>
              {LEAVE_TYPE_LABEL[type] || type}
            </span>
          )
        },
      },
      {
        id: 'dates',
        header: 'Dates & Duration',
        accessorFn: (row) => row.start_date,
        cell: ({ row }) => {
          const { start_date, end_date, days } = row.original
          return (
            <div>
              <p className="text-xs font-semibold text-ink tabular">
                {fmtDate(start_date, 'd MMM')} – {fmtDate(end_date, 'd MMM yyyy')}
              </p>
              <p className="text-[11px] font-bold text-flow-600">
                {days} working day{days === 1 ? '' : 's'}
              </p>
            </div>
          )
        },
      },
      {
        accessorKey: 'remarks',
        header: 'Reason / Remarks',
        cell: ({ row }) => {
          const req = row.original
          return (
            <div className="max-w-[240px]">
              <p className="text-xs text-slate-700 truncate" title={req.remarks || undefined}>
                {req.remarks ? `"${req.remarks}"` : '—'}
              </p>
              {req.review_comment && (
                <p className="text-[11px] text-away truncate mt-0.5" title={req.review_comment}>
                  <strong className="text-slate-600">{req.reviewer_name ?? 'HR'}:</strong> {req.review_comment}
                </p>
              )}
            </div>
          )
        },
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const st = row.original.status
          if (st === 'PENDING') {
            return (
              <span className="inline-flex items-center justify-center rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 border border-amber-200/80 shadow-xs">
                Pending Review
              </span>
            )
          }
          if (st === 'APPROVED') {
            return (
              <span className="inline-flex items-center justify-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200/80 shadow-xs">
                Approved
              </span>
            )
          }
          if (st === 'REJECTED') {
            return (
              <span className="inline-flex items-center justify-center rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700 border border-rose-200/80 shadow-xs">
                Rejected
              </span>
            )
          }
          return (
            <span className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-bold border shadow-xs ${LEAVE_STATUS_TONE[st]}`}>
              {titleCase(st)}
            </span>
          )
        },
      },
      {
        accessorKey: 'created_at',
        header: 'Submitted On',
        cell: ({ row }) => (
          <span className="text-xs text-away tabular">
            {fmtDate(row.original.created_at, 'd MMM yyyy')}
          </span>
        ),
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => {
          const req = row.original
          if (req.status !== 'PENDING') {
            return <span className="text-xs text-away text-right block">Archived</span>
          }
          return (
            <div className="text-right">
              <Button
                variant="secondary"
                size="sm"
                loading={withdrawingId === req.id}
                onClick={() => withdraw(req.id)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 hover:bg-rose-50 hover:border-rose-300"
              >
                <Icon icon="mdi:trash-can-outline" className="h-3.5 w-3.5" />
                <span>Withdraw</span>
              </Button>
            </div>
          )
        },
        enableSorting: false,
      },
    ],
    [withdrawingId],
  )

  return (
    <div className="space-y-6">
      {/* Header & Request Leave Button */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader title="Time Off" />
        <Button
          onClick={() => {
            setBanner(null)
            setIsModalOpen(true)
          }}
          className="flex items-center gap-1.5 text-xs font-bold self-start sm:self-auto shadow-xs"
        >
          <Icon icon="mdi:calendar-plus" className="h-4 w-4" />
          <span>Request Leave</span>
        </Button>
      </div>

      {/* Compact Bento Balance Cards */}
      {balance && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          {/* Paid Leave Balance Card */}
          <div className="relative flex flex-col justify-between overflow-hidden rounded-xl border border-slate-200/80 bg-white p-3.5 sm:p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-flow-700">
                Paid Leave Balance
              </span>
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-flow-50 text-flow-700">
                <Icon icon="mdi:beach" className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold tracking-tight text-flow-700">
                {balance.paid_remaining} <span className="text-xs font-normal text-away">/ {balance.paid_total}d</span>
              </span>
              <span className="text-[11px] font-semibold text-emerald-600">
                {balance.paid_used}d used
              </span>
            </div>
          </div>

          {/* Sick Leave Balance Card */}
          <div className="relative flex flex-col justify-between overflow-hidden rounded-xl border border-slate-200/80 bg-white p-3.5 sm:p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
                Sick Leave Quota
              </span>
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-amber-50 text-amber-700">
                <Icon icon="mdi:medical-bag" className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold tracking-tight text-amber-700">
                {balance.sick_remaining} <span className="text-xs font-normal text-away">/ {balance.sick_total}d</span>
              </span>
              <span className="text-[11px] font-semibold text-away">
                {balance.sick_used}d used
              </span>
            </div>
          </div>

          {/* Pending Reviews Card */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => setStatusFilter('PENDING')}
            className={`relative flex flex-col justify-between overflow-hidden rounded-xl border p-3.5 sm:p-4 transition-all cursor-pointer ${
              statusFilter === 'PENDING'
                ? 'border-amber-500 bg-amber-50/20 ring-2 ring-amber-500/20 shadow-xs'
                : 'border-slate-200/80 bg-white hover:border-amber-200 hover:shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
                Pending Approvals
              </span>
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-amber-100 text-amber-700">
                <Icon icon="mdi:clock-outline" className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold tracking-tight text-amber-700">
                {pendingCount}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600">
                Awaiting HR
              </span>
            </div>
          </div>

          {/* Approved Leaves Card */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => setStatusFilter('APPROVED')}
            className={`relative flex flex-col justify-between overflow-hidden rounded-xl border p-3.5 sm:p-4 transition-all cursor-pointer ${
              statusFilter === 'APPROVED'
                ? 'border-emerald-500 bg-emerald-50/20 ring-2 ring-emerald-500/20 shadow-xs'
                : 'border-slate-200/80 bg-white hover:border-emerald-200 hover:shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                Days Taken YTD
              </span>
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-100 text-emerald-700">
                <Icon icon="mdi:calendar-check" className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold tracking-tight text-emerald-700">
                {totalDaysTaken}d
              </span>
              <span className="text-[11px] font-semibold text-emerald-600">
                {approvedCount} requests
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Notifications / Banners */}
      <FormBanner message={banner} />
      {ok && (
        <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800 border border-emerald-200">
          <div className="flex items-center gap-2">
            <Icon icon="mdi:check-circle" className="h-4 w-4 text-emerald-600" />
            <span>{ok}</span>
          </div>
          <button
            type="button"
            onClick={() => setOk(null)}
            className="text-emerald-600 hover:text-emerald-800"
          >
            <Icon icon="mdi:close" className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Controls Bar: Filters on Left, Search on Right */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        {/* Left Side: Status & Type Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full text-xs font-medium sm:w-36"
          >
            <option value="ALL">All Status</option>
            <option value="PENDING">Pending Only</option>
            <option value="APPROVED">Approved Only</option>
            <option value="REJECTED">Rejected Only</option>
          </Select>

          <Select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full text-xs font-medium sm:w-36"
          >
            <option value="ALL">All Types</option>
            <option value="PAID">Paid Leave</option>
            <option value="SICK">Sick Leave</option>
            <option value="UNPAID">Unpaid Leave</option>
          </Select>
        </div>

        {/* Right Side: Search Input */}
        <div className="relative w-full sm:w-64 md:w-72">
          <Icon
            icon="mdi:magnify"
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-away"
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search reasons or type..."
            className="pl-10 text-xs py-2"
          />
        </div>
      </div>

      {/* Loading Skeletons */}
      {loading && !data && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-4">
            {[0, 1, 2, 3].map((n) => (
              <Skeleton key={n} className="h-12 w-full rounded-xl" />
            ))}
          </div>
        </div>
      )}

      {/* Error state */}
      {error && <ErrorState message={error} onRetry={reload} />}

      {/* TanStack Data Table View */}
      {requests && (
        <DataTable
          columns={columns}
          data={filteredRequests}
          totalCount={requests.items.length}
          emptyMessage="No leave requests found matching your filters."
        />
      )}

      {/* ======================================================== */}
      {/* New Leave Request Modal Dialog                           */}
      {/* ======================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white p-6 shadow-2xl border border-slate-150 animate-in zoom-in-95 duration-150"
            role="dialog"
            aria-modal="true"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-flow-50 text-flow-600 border border-flow-100">
                  <Icon icon="mdi:calendar-plus" className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-ink">Request Time Off</h3>
                  <p className="text-xs text-away">Submit leave for HR officer approval</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <Icon icon="mdi:close" className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Field label="Leave Type" htmlFor="leave-type" error={errors.leave_type?.message}>
                <Select id="leave-type" {...register('leave_type')} className="text-sm">
                  <option value="PAID">
                    Paid leave ({balance ? balance.paid_remaining : 0} days remaining)
                  </option>
                  <option value="SICK">
                    Sick leave ({balance ? balance.sick_remaining : 0} days remaining)
                  </option>
                  <option value="UNPAID">Unpaid leave (loss of pay)</option>
                </Select>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Start Date" htmlFor="start-date" error={errors.start_date?.message}>
                  <Input id="start-date" type="date" {...register('start_date')} className="text-sm" />
                </Field>
                <Field label="End Date" htmlFor="end-date" error={errors.end_date?.message}>
                  <Input id="end-date" type="date" {...register('end_date')} className="text-sm" />
                </Field>
              </div>

              {/* Working Days Calculated Preview */}
              <div className="rounded-xl bg-slate-50 p-3 border border-slate-200/80 flex items-center justify-between text-xs">
                <span className="font-medium text-slate-600">Calculated working days:</span>
                <span className="font-bold text-ink bg-flow-100 text-flow-800 px-2 py-0.5 rounded-md">
                  {computedDays} working day{computedDays === 1 ? '' : 's'}
                </span>
              </div>

              <Field label="Reason / Remarks" htmlFor="leave-remarks" error={errors.remarks?.message}>
                <Textarea
                  id="leave-remarks"
                  placeholder="e.g. Attending family function, medical appointment..."
                  {...register('remarks')}
                  className="min-h-[70px] text-xs"
                />
              </Field>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsModalOpen(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  loading={isSubmitting}
                  className="flex items-center gap-1.5 text-xs font-bold"
                >
                  <Icon icon="mdi:send-outline" className="h-4 w-4" />
                  <span>Submit Request</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
