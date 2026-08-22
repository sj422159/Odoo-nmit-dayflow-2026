import { useCallback, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  ArrowLeft,
  ArrowUpDown,
  CalendarPlus,
  Clock,
  FileText,
  Filter,
  Paperclip,
  Plus,
  Search,
  Trash2,
} from 'lucide-react'
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

type ViewMode = 'list' | 'add'
type SortField = 'start_date' | 'days' | 'leave_type' | 'status'
type SortOrder = 'asc' | 'desc'

export default function Leave() {
  const [view, setView] = useState<ViewMode>('list')
  const [banner, setBanner] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  // Datatable state
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [typeFilter, setTypeFilter] = useState<string>('ALL')
  const [sortField, setSortField] = useState<SortField>('start_date')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [page, setPage] = useState(1)
  const pageSize = 10

  // Proof file state
  const [proofFile, setProofFile] = useState<File | null>(null)

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
    defaultValues: { leave_type: 'PAID', start_date: isoDate(new Date()), end_date: isoDate(new Date()), remarks: '' },
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
      reset({ leave_type: values.leave_type, start_date: values.start_date, end_date: values.end_date, remarks: '' })
      setProofFile(null)
      await reload()
      setView('list')
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

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortOrder('asc')
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
  const rawItems = requests.items

  // Filter items
  const filteredItems = rawItems.filter((req) => {
    if (statusFilter !== 'ALL' && req.status !== statusFilter) return false
    if (typeFilter !== 'ALL' && req.leave_type !== typeFilter) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      const matchType = LEAVE_TYPE_LABEL[req.leave_type]?.toLowerCase().includes(q)
      const matchRemarks = req.remarks?.toLowerCase().includes(q)
      const matchReviewer = req.reviewer_name?.toLowerCase().includes(q)
      const matchStatus = req.status.toLowerCase().includes(q)
      const matchDates = `${req.start_date} ${req.end_date}`.includes(q)
      return matchType || matchRemarks || matchReviewer || matchStatus || matchDates
    }
    return true
  })

  // Sort items
  const sortedItems = [...filteredItems].sort((a, b) => {
    let cmp = 0
    if (sortField === 'start_date') {
      cmp = new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
    } else if (sortField === 'days') {
      cmp = a.days - b.days
    } else if (sortField === 'leave_type') {
      cmp = a.leave_type.localeCompare(b.leave_type)
    } else if (sortField === 'status') {
      cmp = a.status.localeCompare(b.status)
    }
    return sortOrder === 'asc' ? cmp : -cmp
  })

  // Paginate items
  const totalPages = Math.max(1, Math.ceil(sortedItems.length / pageSize))
  const paginatedItems = sortedItems.slice((page - 1) * pageSize, page * pageSize)

  return (
    <>
      <PageHeader
        title={view === 'list' ? 'Time Off Management' : 'Request Time Off'}
        description={
          view === 'list'
            ? 'Track leave balances, inspect past requests, and file new applications.'
            : 'Fill in your leave duration, type, reason, and optional supporting document.'
        }
        actions={
          view === 'list' ? (
            <Button
              onClick={() => {
                setBanner(null)
                setOk(null)
                setView('add')
              }}
              icon={<Plus className="h-4 w-4" />}
            >
              Add Leave Request
            </Button>
          ) : (
            <Button
              variant="secondary"
              onClick={() => setView('list')}
              icon={<ArrowLeft className="h-4 w-4" />}
            >
              Back to My Leaves
            </Button>
          )
        }
      />

      {/* Top Stat Cards (Always visible) */}
      <div className="mb-6 grid gap-4 grid-cols-2 lg:grid-cols-4">
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

      {ok && (
        <p role="status" className="mb-5 rounded-xl bg-present-soft px-4 py-3 text-sm font-semibold text-present">
          {ok}
        </p>
      )}

      {/* PAGE 1: DATATABLE VIEW */}
      {view === 'list' && (
        <Card className="flex flex-col">
          <CardHeader
            title="Leave History & Status"
            subtitle={`${sortedItems.length} request${sortedItems.length === 1 ? '' : 's'} found`}
          />

          {/* Datatable Toolbar: Search & Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-150 p-4 bg-slate-50/50">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-away" />
              <input
                type="text"
                placeholder="Search leaves by type, status, date or reason..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-ink outline-none transition focus:border-flow-500 focus:ring-2 focus:ring-flow-500/20"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 text-xs font-semibold text-away">
                <Filter className="h-3.5 w-3.5" />
                Status:
              </div>
              <div className="flex gap-1 rounded-lg bg-slate-200/60 p-1 text-xs font-semibold">
                {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((st) => (
                  <button
                    key={st}
                    onClick={() => {
                      setStatusFilter(st)
                      setPage(1)
                    }}
                    className={`rounded-md px-2.5 py-1 transition ${
                      statusFilter === st ? 'bg-white shadow-sm text-flow-600 font-bold' : 'text-ink-600 hover:text-ink'
                    }`}
                  >
                    {st === 'ALL' ? 'All' : titleCase(st)}
                  </button>
                ))}
              </div>

              <Select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value)
                  setPage(1)
                }}
                className="py-1.5 text-xs font-semibold"
              >
                <option value="ALL">All Types</option>
                <option value="PAID">Paid Leave</option>
                <option value="SICK">Sick Leave</option>
                <option value="UNPAID">Unpaid Leave</option>
              </Select>
            </div>
          </div>

          {/* Datatable Body */}
          {paginatedItems.length === 0 ? (
            <EmptyState
              title="No leave requests found"
              description={search || statusFilter !== 'ALL' ? 'Try adjusting your search or filters.' : 'Click "Add Leave Request" above to apply for time off.'}
              icon={<CalendarPlus className="h-7 w-7" />}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-150 bg-slate-100/70 text-xs uppercase font-semibold text-away">
                  <tr>
                    <th className="px-5 py-3.5 cursor-pointer select-none hover:text-ink" onClick={() => toggleSort('leave_type')}>
                      <div className="flex items-center gap-1.5">
                        Leave Type
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </th>
                    <th className="px-5 py-3.5 cursor-pointer select-none hover:text-ink" onClick={() => toggleSort('start_date')}>
                      <div className="flex items-center gap-1.5">
                        Dates & Duration
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </th>
                    <th className="px-5 py-3.5 cursor-pointer select-none hover:text-ink" onClick={() => toggleSort('status')}>
                      <div className="flex items-center gap-1.5">
                        Status
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </th>
                    <th className="px-5 py-3.5">Reason & Remarks</th>
                    <th className="px-5 py-3.5">Reviewer Note</th>
                    <th className="px-5 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150">
                  {paginatedItems.map((leave) => (
                    <tr key={leave.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-5 py-4 font-semibold text-ink whitespace-nowrap">
                        {LEAVE_TYPE_LABEL[leave.leave_type]}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="text-ink font-medium tabular">
                          {fmtDate(leave.start_date, 'd MMM yyyy')} – {fmtDate(leave.end_date, 'd MMM yyyy')}
                        </div>
                        <span className="text-xs font-semibold text-away">{leave.days} working day{leave.days === 1 ? '' : 's'}</span>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <Pill tone={LEAVE_STATUS_TONE[leave.status]}>
                          {titleCase(leave.status)}
                        </Pill>
                      </td>
                      <td className="px-5 py-4 max-w-xs text-ink-600 truncate">
                        {leave.remarks || <span className="text-away italic">No remarks</span>}
                      </td>
                      <td className="px-5 py-4 max-w-xs text-ink-600">
                        {leave.review_comment ? (
                          <div className="text-xs rounded-lg bg-slate-100 p-2">
                            <span className="font-semibold text-ink">{leave.reviewer_name || 'HR'}:</span> {leave.review_comment}
                          </div>
                        ) : (
                          <span className="text-xs text-away italic">Awaiting review</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        {leave.status === 'PENDING' ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => withdraw(leave.id)}
                            icon={<Trash2 className="h-3.5 w-3.5 text-rose-500" />}
                          >
                            Withdraw
                          </Button>
                        ) : (
                          <span className="text-xs text-away">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Datatable Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-150 px-5 py-3 text-xs text-away">
              <div>
                Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, sortedItems.length)} of {sortedItems.length} entries
              </div>
              <div className="flex items-center gap-1">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-ink-600 hover:bg-slate-150 disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="px-2 font-bold text-ink">{page} / {totalPages}</span>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-ink-600 hover:bg-slate-150 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* PAGE 2: ADD LEAVE REQUEST FORM */}
      {view === 'add' && (
        <Card className="max-w-2xl mx-auto">
          <CardHeader
            title="New Leave Application"
            subtitle="Weekends and public holidays are excluded from day count."
          />

          <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5 p-6">
            <FormBanner message={banner} />

            <Field label="Leave Category" htmlFor="leave_type" error={errors.leave_type?.message} required>
              <Select id="leave_type" invalid={!!errors.leave_type} {...register('leave_type')}>
                <option value="PAID">Paid Leave (Annual / Privilege)</option>
                <option value="SICK">Sick Leave (Medical / Health)</option>
                <option value="UNPAID">Unpaid Leave (Loss of Pay)</option>
              </Select>
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="From Date" htmlFor="start_date" error={errors.start_date?.message} required>
                <Input id="start_date" type="date" invalid={!!errors.start_date} {...register('start_date')} />
              </Field>

              <Field label="To Date" htmlFor="end_date" error={errors.end_date?.message} required>
                <Input id="end_date" type="date" invalid={!!errors.end_date} {...register('end_date')} />
              </Field>
            </div>

            {/* Calculated Working Days Banner */}
            <div className="flex items-center justify-between rounded-xl bg-flow-50 px-4 py-3 border border-flow-100">
              <div className="flex items-center gap-2 text-sm font-semibold text-flow-700">
                <Clock className="h-4 w-4 text-flow-600" />
                Duration Calculation
              </div>
              <span className="rounded-lg bg-flow-600 px-3 py-1 text-xs font-bold text-white tabular">
                {computedDays} Working Day{computedDays === 1 ? '' : 's'}
              </span>
            </div>

            <Field label="Reason & Remarks" htmlFor="remarks" error={errors.remarks?.message} hint="Provide detail for your HR officer to speed up approval.">
              <Textarea id="remarks" rows={4} placeholder="Describe the reason for your time off request..." {...register('remarks')} />
            </Field>

            <Field label="Proof / Supporting Document" htmlFor="proof" hint="Optional: Medical certificate, invitation, or supporting document (PDF, PNG, JPG).">
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 bg-slate-50/50">
                <Paperclip className="h-5 w-5 text-away shrink-0" />
                <input
                  id="proof"
                  type="file"
                  onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                  className="text-xs text-ink-600 file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-flow-600 file:shadow-sm hover:file:bg-slate-100"
                />
                {proofFile && (
                  <span className="text-xs font-medium text-present flex items-center gap-1">
                    <FileText className="h-3.5 w-3.5" />
                    {proofFile.name}
                  </span>
                )}
              </div>
            </Field>

            <div className="flex items-center justify-end gap-3 border-t border-slate-150 pt-4 mt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setView('list')}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                loading={isSubmitting}
                icon={<CalendarPlus className="h-4 w-4" />}
              >
                Submit Leave Request
              </Button>
            </div>
          </form>
        </Card>
      )}
    </>
  )
}
