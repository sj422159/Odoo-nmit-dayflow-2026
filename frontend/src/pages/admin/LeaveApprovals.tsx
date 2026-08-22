import { useCallback, useState } from 'react'
import { CalendarCheck, Check, X } from 'lucide-react'
import { ApiError, api } from '@/api/client'
import type { LeaveList, LeaveStatus } from '@/api/types'
import { useLiveRefresh } from '@/context/RealtimeContext'
import { useAsync } from '@/hooks/useAsync'
import { PageHeader } from '@/components/PageHeader'
import { StatCard } from '@/components/StatCard'
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  FormBanner,
  Pill,
  Select,
  Skeleton,
  Textarea,
} from '@/components/ui/Primitives'
import { fmtDate, LEAVE_STATUS_TONE, LEAVE_TYPE_LABEL, titleCase } from '@/lib/format'

export default function LeaveApprovals() {
  const [statusFilter, setStatusFilter] = useState<LeaveStatus | ''>('PENDING')
  const [banner, setBanner] = useState<string | null>(null)
  const [comments, setComments] = useState<Record<number, string>>({})
  const [busyId, setBusyId] = useState<number | null>(null)

  const load = useCallback(
    () => api.get<LeaveList>('/leave/requests', { leave_status: statusFilter || undefined, page_size: 50 }),
    [statusFilter],
  )
  const { data, loading, error, reload } = useAsync(load, [statusFilter])
  useLiveRefresh(['leave.requested', 'leave.approved', 'leave.rejected'], reload)

  const decide = async (id: number, decision: 'APPROVED' | 'REJECTED') => {
    setBanner(null)
    setBusyId(id)
    try {
      await api.patch(`/leave/requests/${id}/decision`, {
        decision,
        comment: comments[id]?.trim() || null,
      })
      await reload()
    } catch (err) {
      setBanner(err instanceof ApiError ? err.message : 'Could not record that decision.')
    } finally {
      setBusyId(null)
    }
  }

  if (loading && !data) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-12 w-56" />
        <Skeleton className="h-24" />
        <Skeleton className="h-96" />
      </div>
    )
  }
  if (error || !data) return <ErrorState message={error ?? 'No data came back.'} onRetry={reload} />

  return (
    <>
      <PageHeader
        title="Leave approvals"
        description="Review time-off requests and record a decision."
        actions={
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as LeaveStatus | '')} className="w-44">
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="">All</option>
          </Select>
        }
      />

      <div className="mb-5">
        <StatCard label="Awaiting a decision" value={data.pending_count} tone={data.pending_count ? 'pending' : 'default'} />
      </div>

      <FormBanner message={banner} />

      <Card className="mt-3">
        {data.items.length === 0 ? (
          <EmptyState
            title="Nothing here"
            description="No requests match the selected filter."
            icon={<CalendarCheck className="h-7 w-7" />}
          />
        ) : (
          <ul className="divide-y divide-slate-150">
            {data.items.map((leave) => (
              <li key={leave.id} className="flex flex-col gap-3 px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">{leave.employee_name}</p>
                    <p className="text-sm text-away tabular">
                      {leave.employee_code} · {titleCase(leave.department ?? '')}
                    </p>
                    <p className="mt-1 text-sm text-ink-600">
                      {LEAVE_TYPE_LABEL[leave.leave_type]} · {fmtDate(leave.start_date, 'd MMM')} –{' '}
                      {fmtDate(leave.end_date, 'd MMM yyyy')} · {leave.days} day{leave.days === 1 ? '' : 's'}
                    </p>
                    {leave.remarks && <p className="mt-1 text-sm text-ink-600">"{leave.remarks}"</p>}
                    {leave.review_comment && (
                      <p className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-sm text-ink-600">
                        <span className="font-semibold">{leave.reviewer_name ?? 'HR'}:</span> {leave.review_comment}
                      </p>
                    )}
                  </div>
                  <Pill tone={LEAVE_STATUS_TONE[leave.status]}>{titleCase(leave.status)}</Pill>
                </div>

                {leave.status === 'PENDING' && (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Textarea
                      placeholder="Optional comment for the employee"
                      value={comments[leave.id] ?? ''}
                      onChange={(e) => setComments((prev) => ({ ...prev, [leave.id]: e.target.value }))}
                      className="min-h-[44px] flex-1"
                    />
                    <div className="flex shrink-0 gap-2">
                      <Button
                        variant="success"
                        size="sm"
                        loading={busyId === leave.id}
                        onClick={() => decide(leave.id, 'APPROVED')}
                        icon={<Check className="h-3.5 w-3.5" />}
                      >
                        Approve
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        loading={busyId === leave.id}
                        onClick={() => decide(leave.id, 'REJECTED')}
                        icon={<X className="h-3.5 w-3.5" />}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  )
}
