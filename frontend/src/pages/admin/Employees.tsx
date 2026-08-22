import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Search, Users } from 'lucide-react'
import { api } from '@/api/client'
import type { EmployeeSummary, Paginated } from '@/api/types'
import { useLiveRefresh } from '@/context/RealtimeContext'
import { useAsync } from '@/hooks/useAsync'
import { PageHeader } from '@/components/PageHeader'
import { Button, Card, EmptyState, ErrorState, Input, Pill, Select, Skeleton } from '@/components/ui/Primitives'
import { STATUS_LABEL, STATUS_TONE, initials, titleCase } from '@/lib/format'

export default function Employees() {
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [department, setDepartment] = useState('')
  const [page, setPage] = useState(1)
  const [departments, setDepartments] = useState<string[]>([])

  useEffect(() => {
    const id = setTimeout(() => {
      setDebounced(search)
      setPage(1)
    }, 300)
    return () => clearTimeout(id)
  }, [search])

  useEffect(() => {
    api.get<string[]>('/employees/departments').then(setDepartments).catch(() => setDepartments([]))
  }, [])

  const load = useCallback(
    () =>
      api.get<Paginated<EmployeeSummary>>('/employees', {
        search: debounced || undefined,
        department: department || undefined,
        page,
        page_size: 12,
      }),
    [debounced, department, page],
  )
  const { data, loading, error, reload } = useAsync(load, [debounced, department, page])
  useLiveRefresh(['employee.updated', 'attendance.checked_in', 'attendance.checked_out'], reload)

  return (
    <>
      <PageHeader title="People" description="Every employee, with today's attendance at a glance." />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-away" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email or employee ID"
            className="pl-10"
          />
        </div>
        <Select
          value={department}
          onChange={(e) => {
            setDepartment(e.target.value)
            setPage(1)
          }}
          className="sm:w-56"
        >
          <option value="">All departments</option>
          {departments.map((dept) => (
            <option key={dept} value={dept}>
              {titleCase(dept)}
            </option>
          ))}
        </Select>
      </div>

      {loading && !data && (
        <div className="grid gap-3">
          {[0, 1, 2, 3, 4].map((n) => (
            <Skeleton key={n} className="h-16" />
          ))}
        </div>
      )}
      {error && <ErrorState message={error} onRetry={reload} />}

      {data && (
        <Card>
          {data.items.length === 0 ? (
            <EmptyState
              title="No employees found"
              description="Try a different search term or clear the department filter."
              icon={<Users className="h-7 w-7" />}
            />
          ) : (
            <ul className="divide-y divide-slate-150">
              {data.items.map((employee) => (
                <li key={employee.id}>
                  <Link
                    to={`/admin/employees/${employee.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-slate-50"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      {employee.avatar_url ? (
                        <img src={employee.avatar_url} alt={employee.full_name} className="h-9 w-9 shrink-0 rounded-full object-cover" />
                      ) : (
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-flow-50 text-xs font-bold text-flow-600">
                          {initials(employee.full_name)}
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink">{employee.full_name}</p>
                        <p className="truncate text-sm text-away">
                          {employee.employee_code} · {employee.designation} · {titleCase(employee.department)}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {employee.today_status ? (
                        <Pill tone={STATUS_TONE[employee.today_status].chip}>{STATUS_LABEL[employee.today_status]}</Pill>
                      ) : (
                        <Pill tone="bg-slate-150 text-away">No record</Pill>
                      )}
                      {!employee.is_active && <Pill tone="bg-absent-soft text-absent">Inactive</Pill>}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {data.pages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-150 px-5 py-3.5">
              <p className="text-sm text-away">
                Page {data.page} of {data.pages} · {data.total} total
              </p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page <= 1}
                  icon={<ChevronLeft className="h-4 w-4" />}
                >
                  Prev
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= data.pages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}
    </>
  )
}
