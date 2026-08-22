import { useCallback, useEffect, useState } from 'react'
import { addDays, subDays } from 'date-fns'
import { ChevronLeft, ChevronRight, ClipboardList, Pencil } from 'lucide-react'
import { ApiError, api } from '@/api/client'
import type { AttendanceRecord, AttendanceStatus } from '@/api/types'
import { useLiveRefresh } from '@/context/RealtimeContext'
import { useAsync } from '@/hooks/useAsync'
import { PageHeader } from '@/components/PageHeader'
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  FormBanner,
  Input,
  Pill,
  Select,
  Skeleton,
} from '@/components/ui/Primitives'
import { fmtDate, fmtDuration, fmtTime, STATUS_LABEL, STATUS_TONE, titleCase } from '@/lib/format'

export default function AttendanceBoard() {
  const [day, setDay] = useState(new Date())
  const [department, setDepartment] = useState('')
  const [statusFilter, setStatusFilter] = useState<AttendanceStatus | ''>('')
  const [departments, setDepartments] = useState<string[]>([])
  const [editing, setEditing] = useState<AttendanceRecord | null>(null)

  useEffect(() => {
    api.get<string[]>('/employees/departments').then(setDepartments).catch(() => setDepartments([]))
  }, [])

  const isoDay = fmtDate(day.toISOString(), 'yyyy-MM-dd')

  const load = useCallback(
    () =>
      api.get<AttendanceRecord[]>('/attendance', {
        day: isoDay,
        department: department || undefined,
        attendance_status: statusFilter || undefined,
      }),
    [isoDay, department, statusFilter],
  )
  const { data, loading, error, reload } = useAsync(load, [isoDay, department, statusFilter])
  useLiveRefresh(['attendance.checked_in', 'attendance.checked_out', 'attendance.updated'], reload)

  return (
    <>
      <PageHeader title="Attendance board" description="Every check-in for the selected day, with manual override." />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-2xl border border-slate-150 bg-white px-3 py-2 shadow-card">
          <Button variant="ghost" size="sm" onClick={() => setDay((d) => subDays(d, 1))} icon={<ChevronLeft className="h-4 w-4" />} />
          <p className="min-w-[9rem] text-center text-sm font-semibold text-ink tabular">{fmtDate(isoDay, 'EEE, d MMM yyyy')}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDay((d) => addDays(d, 1))}
            disabled={day >= new Date()}
            icon={<ChevronRight className="h-4 w-4" />}
          />
        </div>
        <Select value={department} onChange={(e) => setDepartment(e.target.value)} className="w-48">
          <option value="">All departments</option>
          {departments.map((dept) => (
            <option key={dept} value={dept}>
              {titleCase(dept)}
            </option>
          ))}
        </Select>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as AttendanceStatus | '')} className="w-44">
          <option value="">All statuses</option>
          <option value="PRESENT">Present</option>
          <option value="HALF_DAY">Half day</option>
          <option value="ABSENT">Absent</option>
          <option value="LEAVE">On leave</option>
        </Select>
      </div>

      {loading && !data && (
        <div className="grid gap-3">
          {[0, 1, 2, 3].map((n) => (
            <Skeleton key={n} className="h-16" />
          ))}
        </div>
      )}
      {error && <ErrorState message={error} onRetry={reload} />}

      {data && (
        <Card>
          {data.length === 0 ? (
            <EmptyState
              title="No records for this day"
              description="Nobody matches the current filters for the selected date."
              icon={<ClipboardList className="h-7 w-7" />}
            />
          ) : (
            <ul className="divide-y divide-slate-150">
              {data.map((record) => (
                <li key={record.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{record.employee_name}</p>
                    <p className="text-sm text-away tabular">{record.employee_code}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="hidden text-sm text-away tabular sm:inline">
                      {record.check_in ? `${fmtTime(record.check_in)}–${record.check_out ? fmtTime(record.check_out) : '…'}` : '—'}
                    </span>
                    <span className="w-16 text-right text-sm font-semibold text-ink tabular">
                      {record.worked_minutes ? fmtDuration(record.worked_minutes) : '—'}
                    </span>
                    <Pill tone={STATUS_TONE[record.status].chip}>{STATUS_LABEL[record.status]}</Pill>
                    <Button variant="ghost" size="sm" onClick={() => setEditing(record)} icon={<Pencil className="h-3.5 w-3.5" />}>
                      Edit
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {editing && (
        <CorrectionModal
          record={editing}
          workDate={isoDay}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            reload()
          }}
        />
      )}
    </>
  )
}

function CorrectionModal({
  record,
  workDate,
  onClose,
  onSaved,
}: {
  record: AttendanceRecord
  workDate: string
  onClose: () => void
  onSaved: () => void
}) {
  const [status, setStatus] = useState<AttendanceStatus>(record.status)
  const [checkIn, setCheckIn] = useState(record.check_in ? record.check_in.slice(0, 16) : '')
  const [checkOut, setCheckOut] = useState(record.check_out ? record.check_out.slice(0, 16) : '')
  const [note, setNote] = useState(record.note ?? '')
  const [banner, setBanner] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    setBanner(null)
    try {
      await api.put('/attendance/record', {
        employee_id: record.employee_id,
        work_date: workDate,
        status,
        check_in: checkIn ? new Date(checkIn).toISOString() : null,
        check_out: checkOut ? new Date(checkOut).toISOString() : null,
        note: note || null,
      })
      onSaved()
    } catch (err) {
      setBanner(err instanceof ApiError ? err.message : 'Could not save that correction.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl border border-slate-150 bg-white p-5 shadow-lift"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-base font-bold text-ink">Correct {record.employee_name}'s record</h2>
        <div className="flex flex-col gap-4">
          <FormBanner message={banner} />
          <Field label="Status" htmlFor="c-status">
            <Select id="c-status" value={status} onChange={(e) => setStatus(e.target.value as AttendanceStatus)}>
              <option value="PRESENT">Present</option>
              <option value="HALF_DAY">Half day</option>
              <option value="ABSENT">Absent</option>
              <option value="LEAVE">On leave</option>
            </Select>
          </Field>
          <Field label="Check in" htmlFor="c-in">
            <Input id="c-in" type="datetime-local" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
          </Field>
          <Field label="Check out" htmlFor="c-out">
            <Input id="c-out" type="datetime-local" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
          </Field>
          <Field label="Note" htmlFor="c-note" hint="Optional — visible to the employee.">
            <Input id="c-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={255} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={save} loading={saving}>
              Save correction
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
