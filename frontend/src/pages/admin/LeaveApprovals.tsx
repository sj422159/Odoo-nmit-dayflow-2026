import { useCallback, useMemo, useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { Icon } from '@iconify/react'
import { ApiError, api } from '@/api/client'
import type { AILeaveEvaluation, LeaveList, LeaveRequest, LeaveStatus, LeaveType } from '@/api/types'
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
import { fmtDate, LEAVE_STATUS_TONE, LEAVE_TYPE_LABEL, titleCase } from '@/lib/format'

export default function LeaveApprovals() {
  const [statusFilter, setStatusFilter] = useState<LeaveStatus | 'ALL'>('ALL')
  const [typeFilter, setTypeFilter] = useState<LeaveType | 'ALL'>('ALL')
  const [search, setSearch] = useState('')
  const [banner, setBanner] = useState<string | null>(null)
  const [successBanner, setSuccessBanner] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [massBusy, setMassBusy] = useState(false)

  // Single review modal state
  const [reviewModal, setReviewModal] = useState<{
    request: LeaveRequest
    decision: 'APPROVED' | 'REJECTED'
  } | null>(null)
  const [reviewComment, setReviewComment] = useState('')

  // AI evaluation modal state
  const [aiModal, setAiModal] = useState<{
    request: LeaveRequest
    evaluation?: AILeaveEvaluation
    loading: boolean
  } | null>(null)

  const handleAiEvaluate = async (req: LeaveRequest) => {
    setAiModal({ request: req, loading: true })
    try {
      const evalRes = await api.post<AILeaveEvaluation>(`/leave/requests/${req.id}/ai-evaluate`)
      setAiModal({ request: req, evaluation: evalRes, loading: false })
    } catch {
      setBanner('Failed to evaluate leave request with AI assistant.')
      setAiModal(null)
    }
  }


  const load = useCallback(
    () => api.get<LeaveList>('/leave/requests', { page_size: 100 }),
    [],
  )
  const { data, loading, error, reload } = useAsync(load, [])
  useLiveRefresh(['leave.requested', 'leave.approved', 'leave.rejected'], reload)

  // Single decision action
  const decide = async (id: number, decision: 'APPROVED' | 'REJECTED', comment?: string | null) => {
    setBanner(null)
    setSuccessBanner(null)
    setBusyId(id)
    try {
      await api.patch(`/leave/requests/${id}/decision`, {
        decision,
        comment: comment?.trim() || null,
      })
      setSuccessBanner(`Request successfully ${decision.toLowerCase()}.`)
      await reload()
    } catch (err) {
      setBanner(err instanceof ApiError ? err.message : 'Could not record that decision.')
    } finally {
      setBusyId(null)
      setReviewModal(null)
      setReviewComment('')
    }
  }

  // Mass decision action
  const handleMassDecision = async (selectedIds: number[], decision: 'APPROVED' | 'REJECTED') => {
    if (selectedIds.length === 0) return
    setBanner(null)
    setSuccessBanner(null)
    setMassBusy(true)
    try {
      await Promise.all(
        selectedIds.map((id) =>
          api.patch(`/leave/requests/${id}/decision`, {
            decision,
            comment: `Mass ${decision.toLowerCase()} by HR administrator.`,
          }),
        ),
      )
      setSuccessBanner(`Successfully ${decision.toLowerCase()} ${selectedIds.length} leave request(s).`)
      await reload()
    } catch (err) {
      setBanner(err instanceof ApiError ? err.message : 'Failed to process some decisions.')
    } finally {
      setMassBusy(false)
    }
  }

  // Filtered items
  const filteredItems = useMemo(() => {
    return (data?.items ?? []).filter((req) => {
      if (statusFilter !== 'ALL' && req.status !== statusFilter) return false
      if (typeFilter !== 'ALL' && req.leave_type !== typeFilter) return false
      if (!search.trim()) return true
      const q = search.toLowerCase()
      const name = req.employee_name || ''
      const code = req.employee_code || ''
      const remarks = req.remarks || ''
      const dept = req.department || ''
      return (
        name.toLowerCase().includes(q) ||
        code.toLowerCase().includes(q) ||
        remarks.toLowerCase().includes(q) ||
        dept.toLowerCase().includes(q)
      )
    })
  }, [data?.items, statusFilter, typeFilter, search])

  // Counts for Bento Cards
  const totalCount = data?.items.length ?? 0
  const pendingCount = data?.items.filter((r) => r.status === 'PENDING').length ?? 0
  const approvedCount = data?.items.filter((r) => r.status === 'APPROVED').length ?? 0
  const rejectedCount = data?.items.filter((r) => r.status === 'REJECTED').length ?? 0

  // TanStack DataTable Columns (WITH MULTISELECT)
  const columns = useMemo<ColumnDef<LeaveRequest>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <input
            type="checkbox"
            className="rounded border-slate-300 text-flow-600 focus:ring-flow-500 cursor-pointer h-4 w-4"
            checked={table.getIsAllPageRowsSelected()}
            ref={(input) => {
              if (input) {
                input.indeterminate = !table.getIsAllPageRowsSelected() && table.getIsSomePageRowsSelected()
              }
            }}
            onChange={(e) => table.toggleAllPageRowsSelected(!!e.target.checked)}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            className="rounded border-slate-300 text-flow-600 focus:ring-flow-500 cursor-pointer h-4 w-4"
            checked={row.getIsSelected()}
            onChange={(e) => row.toggleSelected(!!e.target.checked)}
            aria-label="Select row"
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: 'employee_name',
        header: 'Employee',
        cell: ({ row }) => {
          const leave = row.original
          return (
            <div className="min-w-0">
              <p className="truncate font-semibold text-ink hover:text-flow-600 transition-colors">
                {leave.employee_name}
              </p>
              <p className="truncate text-xs font-mono text-away">
                {leave.employee_code} · {titleCase(leave.department ?? '')}
              </p>
            </div>
          )
        },
      },
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
                {days} day{days === 1 ? '' : 's'}
              </p>
            </div>
          )
        },
      },
      {
        accessorKey: 'remarks',
        header: 'Reason / Remarks',
        cell: ({ row }) => {
          const leave = row.original
          return (
            <div className="max-w-[220px]">
              <p className="text-xs text-slate-700 truncate" title={leave.remarks || undefined}>
                {leave.remarks ? `"${leave.remarks}"` : '—'}
              </p>
              {leave.review_comment && (
                <p className="text-[11px] text-away truncate mt-0.5" title={leave.review_comment}>
                  <strong className="text-slate-600">{leave.reviewer_name ?? 'HR'}:</strong> {leave.review_comment}
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
                Pending
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
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => {
          const leave = row.original
          if (leave.status !== 'PENDING') {
            return <span className="text-xs text-away text-right block">Processed</span>
          }
          return (
            <div className="flex items-center justify-end gap-1.5">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleAiEvaluate(leave)}
                className="inline-flex items-center gap-1 text-xs font-bold text-flow-700 bg-flow-50 hover:bg-flow-100 border-flow-200"
                title="Ask Mistral AI Assistant"
              >
                <Icon icon="mdi:robot-sparkles" className="h-3.5 w-3.5 text-flow-600" />
                <span>AI Review</span>
              </Button>
              <Button
                variant="secondary"
                size="sm"
                loading={busyId === leave.id}
                onClick={() => {
                  setReviewModal({ request: leave, decision: 'APPROVED' })
                  setReviewComment('')
                }}
                className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300"
              >
                <Icon icon="mdi:check" className="h-3.5 w-3.5" />
                <span>Approve</span>
              </Button>
              <Button
                variant="secondary"
                size="sm"
                loading={busyId === leave.id}
                onClick={() => {
                  setReviewModal({ request: leave, decision: 'REJECTED' })
                  setReviewComment('')
                }}
                className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 hover:bg-rose-50 hover:border-rose-300"
              >
                <Icon icon="mdi:close" className="h-3.5 w-3.5" />
                <span>Reject</span>
              </Button>
            </div>
          )

        },
        enableSorting: false,
      },
    ],
    [busyId],
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader title="Leave Approvals" />
        {pendingCount > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800 border border-amber-200/80 shadow-xs self-start sm:self-auto">
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            {pendingCount} Pending Review
          </span>
        )}
      </div>

      {/* Compact Bento Status Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        {/* Pending Card */}
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
              Pending Review
            </span>
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-amber-100 text-amber-700">
              <Icon icon="mdi:clock-alert-outline" className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-amber-700">
              {loading && !data ? '—' : pendingCount}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600">
              Action Required
            </span>
          </div>
        </div>

        {/* Approved Card */}
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
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Approved</span>
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-100 text-emerald-700">
              <Icon icon="mdi:check-decagram-outline" className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-emerald-700">
              {loading && !data ? '—' : approvedCount}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
              Authorized
            </span>
          </div>
        </div>

        {/* Rejected Card */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setStatusFilter('REJECTED')}
          className={`relative flex flex-col justify-between overflow-hidden rounded-xl border p-3.5 sm:p-4 transition-all cursor-pointer ${
            statusFilter === 'REJECTED'
              ? 'border-rose-500 bg-rose-50/20 ring-2 ring-rose-500/20 shadow-xs'
              : 'border-slate-200/80 bg-white hover:border-rose-200 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700">Rejected</span>
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-rose-100 text-rose-700">
              <Icon icon="mdi:close-octagon-outline" className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-rose-700">
              {loading && !data ? '—' : rejectedCount}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600">
              Declined
            </span>
          </div>
        </div>

        {/* Total Requests Card */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setStatusFilter('ALL')}
          className={`relative flex flex-col justify-between overflow-hidden rounded-xl border p-3.5 sm:p-4 transition-all cursor-pointer ${
            statusFilter === 'ALL'
              ? 'border-flow-500 bg-white ring-2 ring-flow-500/20 shadow-xs'
              : 'border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Requests
            </span>
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-slate-100 text-slate-700">
              <Icon icon="mdi:calendar-multiselect" className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-ink">
              {loading && !data ? '—' : totalCount}
            </span>
            <span className="text-[11px] font-semibold text-away">All Submissions</span>
          </div>
        </div>
      </div>

      {/* Notifications / Banners */}
      <FormBanner message={banner} />
      {successBanner && (
        <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800 border border-emerald-200">
          <div className="flex items-center gap-2">
            <Icon icon="mdi:check-circle" className="h-4 w-4 text-emerald-600" />
            <span>{successBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessBanner(null)}
            className="text-emerald-600 hover:text-emerald-800"
          >
            <Icon icon="mdi:close" className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* 3 Explicit Status Tabs: Pending, Approved, Rejected */}
      <div className="border border-slate-200 bg-white rounded-2xl p-1.5 shadow-xs flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => setStatusFilter('PENDING')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            statusFilter === 'PENDING'
              ? 'bg-amber-500 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Icon icon="mdi:clock-alert-outline" className="h-4 w-4" />
          <span>Pending Approvals</span>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
              statusFilter === 'PENDING' ? 'bg-white/30 text-white' : 'bg-amber-100 text-amber-800'
            }`}
          >
            {pendingCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('APPROVED')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            statusFilter === 'APPROVED'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Icon icon="mdi:check-decagram-outline" className="h-4 w-4" />
          <span>Approved</span>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
              statusFilter === 'APPROVED' ? 'bg-white/30 text-white' : 'bg-emerald-100 text-emerald-800'
            }`}
          >
            {approvedCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('REJECTED')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            statusFilter === 'REJECTED'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Icon icon="mdi:close-octagon-outline" className="h-4 w-4" />
          <span>Rejected</span>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
              statusFilter === 'REJECTED' ? 'bg-white/30 text-white' : 'bg-rose-100 text-rose-800'
            }`}
          >
            {rejectedCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('ALL')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer sm:ml-auto ${
            statusFilter === 'ALL'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          <span>All Submissions ({totalCount})</span>
        </button>
      </div>

      {/* Controls Bar: Type Filter on Left, Search on Right */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        {/* Left Side: Type Filter */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as LeaveType | 'ALL')}
            className="w-full text-xs font-medium sm:w-40"
          >
            <option value="ALL">All Leave Types</option>
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
            placeholder="Search employee, remarks..."
            className="pl-10 text-xs py-2"
          />
        </div>
      </div>


      {/* Loading Skeleton */}
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

      {/* TanStack Data Table View with Mass Action Banner */}
      {data && (
        <LeaveDataTable
          columns={columns}
          data={filteredItems}
          onMassApprove={(ids) => handleMassDecision(ids, 'APPROVED')}
          onMassReject={(ids) => handleMassDecision(ids, 'REJECTED')}
          massBusy={massBusy}
        />
      )}

      {/* Review & Add Comment Modal */}
      {reviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="w-full max-w-md rounded-2xl border border-slate-150 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-150"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <span
                  className={`grid h-9 w-9 place-items-center rounded-xl border ${
                    reviewModal.decision === 'APPROVED'
                      ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                      : 'bg-rose-50 text-rose-600 border-rose-100'
                  }`}
                >
                  <Icon
                    icon={reviewModal.decision === 'APPROVED' ? 'mdi:check' : 'mdi:close'}
                    className="h-5 w-5"
                  />
                </span>
                <div>
                  <h3 className="text-base font-bold text-ink">
                    {reviewModal.decision === 'APPROVED' ? 'Approve Request' : 'Reject Request'}
                  </h3>
                  <p className="text-xs text-away">{reviewModal.request.employee_name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReviewModal(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <Icon icon="mdi:close" className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-700 space-y-1">
                <p>
                  <strong>Dates:</strong> {fmtDate(reviewModal.request.start_date, 'd MMM')} –{' '}
                  {fmtDate(reviewModal.request.end_date, 'd MMM yyyy')} ({reviewModal.request.days} days)
                </p>
                <p>
                  <strong>Type:</strong> {LEAVE_TYPE_LABEL[reviewModal.request.leave_type]}
                </p>
                {reviewModal.request.remarks && (
                  <p>
                    <strong>Reason:</strong> "{reviewModal.request.remarks}"
                  </p>
                )}
              </div>

              <Field
                label="Reviewer Comment (Optional)"
                htmlFor="modal-review-comment"
                hint="Visible to employee in their leave history."
              >
                <Textarea
                  id="modal-review-comment"
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="e.g. Approved. Enjoy your time off!"
                  className="min-h-[70px] text-xs"
                />
              </Field>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button variant="secondary" onClick={() => setReviewModal(null)} className="text-xs">
                  Cancel
                </Button>
                <Button
                  variant={reviewModal.decision === 'APPROVED' ? 'success' : 'danger'}
                  loading={busyId === reviewModal.request.id}
                  onClick={() =>
                    decide(reviewModal.request.id, reviewModal.decision, reviewComment)
                  }
                  className="flex items-center gap-1.5 text-xs font-bold"
                >
                  <Icon
                    icon={reviewModal.decision === 'APPROVED' ? 'mdi:check' : 'mdi:close'}
                    className="h-4 w-4"
                  />
                  <span>Confirm {reviewModal.decision === 'APPROVED' ? 'Approval' : 'Rejection'}</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mistral AI Assistant Recommendation Modal */}

      {aiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-150">
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-flow-100 text-flow-700">
                  <Icon icon="mdi:robot-sparkles" className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-ink flex items-center gap-2">
                    Mistral AI Decision Assistant
                  </h3>
                  <p className="text-xs text-away">{aiModal.request.employee_name} · {aiModal.request.days} day(s) {LEAVE_TYPE_LABEL[aiModal.request.leave_type]}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAiModal(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <Icon icon="mdi:close" className="h-5 w-5" />
              </button>
            </div>

            {aiModal.loading ? (
              <div className="py-8 text-center space-y-3">
                <Icon icon="mdi:loading" className="h-8 w-8 text-flow-600 animate-spin mx-auto" />
                <p className="text-xs font-bold text-ink">Evaluating leave reason, policy rules & balances with Mistral AI...</p>
              </div>
            ) : aiModal.evaluation ? (
              <div className="space-y-4 text-xs">
                {/* AI Recommendation Banner */}
                <div
                  className={`p-4 rounded-xl border flex items-center justify-between ${
                    aiModal.evaluation.recommendation === 'APPROVE'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : aiModal.evaluation.recommendation === 'REJECT'
                      ? 'bg-rose-50 border-rose-200 text-rose-900'
                      : 'bg-amber-50 border-amber-200 text-amber-900'
                  }`}
                >
                  <div>
                    <p className="text-[10px] uppercase font-bold tracking-wider opacity-75">AI Recommendation</p>
                    <h4 className="text-base font-extrabold flex items-center gap-1.5 mt-0.5">
                      {aiModal.evaluation.recommendation === 'APPROVE' && <Icon icon="mdi:check-circle" className="h-5 w-5 text-emerald-600" />}
                      {aiModal.evaluation.recommendation === 'REJECT' && <Icon icon="mdi:close-circle" className="h-5 w-5 text-rose-600" />}
                      {aiModal.evaluation.recommendation === 'NEEDS_MORE_INFO' && <Icon icon="mdi:help-circle" className="h-5 w-5 text-amber-600" />}
                      {aiModal.evaluation.recommendation === 'APPROVE'
                        ? 'RECOMMEND APPROVAL'
                        : aiModal.evaluation.recommendation === 'REJECT'
                        ? 'RECOMMEND REJECTION'
                        : 'NEEDS MORE INFORMATION'}
                    </h4>
                  </div>
                  <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-extrabold shadow-xs">
                    {aiModal.evaluation.confidence}% Confidence
                  </span>
                </div>

                {/* Summary Box */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-150">
                  <p className="font-semibold text-slate-800">{aiModal.evaluation.summary}</p>
                </div>

                {/* Key Rationale List */}
                <div className="space-y-1.5">
                  <p className="font-bold text-slate-700 uppercase text-[10px] tracking-wider">Key Analysis Points</p>
                  <ul className="space-y-1">
                    {aiModal.evaluation.reasoning.map((point, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-slate-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-flow-600 mt-1.5 shrink-0" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* One-Click Apply Button */}
                <div className="pt-3 border-t border-slate-150 flex items-center justify-between gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setAiModal(null)}>
                    Dismiss
                  </Button>
                  <Button
                    variant={aiModal.evaluation.recommendation === 'REJECT' ? 'danger' : 'success'}
                    size="sm"
                    className="font-bold text-xs flex items-center gap-1.5"
                    onClick={() => {
                      const dec = aiModal.evaluation?.recommendation === 'REJECT' ? 'REJECTED' : 'APPROVED'
                      const comment = aiModal.evaluation?.suggested_comment || ''
                      const req = aiModal.request
                      setAiModal(null)
                      setReviewModal({ request: req, decision: dec })
                      setReviewComment(comment)
                    }}
                  >
                    <Icon icon="mdi:magic-staff" className="h-4 w-4" />
                    <span>Apply AI Recommendation ({aiModal.evaluation.recommendation === 'REJECT' ? 'Reject' : 'Approve'})</span>
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}


function LeaveDataTable({
  columns,
  data,
  onMassApprove,
  onMassReject,
  massBusy,
}: {
  columns: ColumnDef<LeaveRequest>[]
  data: LeaveRequest[]
  onMassApprove: (ids: number[]) => void
  onMassReject: (ids: number[]) => void
  massBusy: boolean
}) {
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  const selectedRowsBanner = useMemo(() => {
    return (
      <div className="flex items-center gap-2">
        <Button
          variant="success"
          size="sm"
          loading={massBusy}
          onClick={() => onMassApprove(selectedIds)}
          className="flex items-center gap-1 text-xs font-bold"
        >
          <Icon icon="mdi:check-all" className="h-3.5 w-3.5" />
          <span>Approve Selected ({selectedIds.length})</span>
        </Button>
        <Button
          variant="danger"
          size="sm"
          loading={massBusy}
          onClick={() => onMassReject(selectedIds)}
          className="flex items-center gap-1 text-xs font-bold"
        >
          <Icon icon="mdi:close-octagon" className="h-3.5 w-3.5" />
          <span>Reject Selected ({selectedIds.length})</span>
        </Button>
      </div>
    )
  }, [selectedIds, massBusy, onMassApprove, onMassReject])

  return (
    <DataTable
      columns={columns}
      data={data}
      totalCount={data.length}
      emptyMessage="No leave requests found matching your filters."
      selectedRowsBanner={selectedRowsBanner}
      onRowSelectionChangeCallback={(selectedRows) => {
        const ids = selectedRows.map((r) => r.id)
        setSelectedIds(ids)
      }}
    />
  )
}
