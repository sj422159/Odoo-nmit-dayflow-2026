import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { type ColumnDef } from '@tanstack/react-table'
import { Icon } from '@iconify/react'
import { ApiError, api } from '@/api/client'
import type { Department, EmployeeSummary, Paginated } from '@/api/types'
import { useLiveRefresh } from '@/context/RealtimeContext'
import { useAsync } from '@/hooks/useAsync'
import { PageHeader } from '@/components/PageHeader'
import { Button, Card, CardHeader, ErrorState, Input, Select, Skeleton } from '@/components/ui/Primitives'
import { DataTable } from '@/components/ui/DataTable'
import { titleCase } from '@/lib/format'

export default function Employees() {
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [department, setDepartment] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL')
  const [page, setPage] = useState(1)
  const [departments, setDepartments] = useState<Department[]>([])
  const [assignment, setAssignment] = useState<Record<number, string>>({})
  const [approvalError, setApprovalError] = useState<string | null>(null)
  const [rejecting, setRejecting] = useState<number | null>(null)

  useEffect(() => {
    const id = setTimeout(() => {
      setDebounced(search)
      setPage(1)
    }, 300)
    return () => clearTimeout(id)
  }, [search])

  useEffect(() => {
    api.get<Department[]>('/employees/departments').then(setDepartments).catch(() => setDepartments([]))
  }, [])

  const load = useCallback(
    () =>
      api.get<Paginated<EmployeeSummary>>('/employees', {
        search: debounced || undefined,
        department: department || undefined,
        page,
        page_size: 50,
      }),
    [debounced, department, page],
  )
  const { data, loading, error, reload } = useAsync(load, [debounced, department, page])
  const pendingLoad = useCallback(() => api.get<Paginated<EmployeeSummary>>('/employees/pending-access'), [])
  const { data: pending, reload: reloadPending } = useAsync(pendingLoad, [])
  useLiveRefresh(['employee.updated', 'attendance.checked_in', 'attendance.checked_out'], reload)

  const approve = async (employee: EmployeeSummary) => {
    setApprovalError(null)
    try {
      const selected = assignment[employee.id] ?? 'overall'
      await api.post(`/employees/${employee.id}/approve`, {
        assignment_scope: selected === 'overall' ? 'overall' : 'department',
        department_id: selected === 'overall' ? undefined : Number(selected),
      })
      await reloadPending()
      await reload()
    } catch (err) {
      setApprovalError(err instanceof ApiError ? err.message : 'Unable to approve this request.')
    }
  }

  const reject = async (employee: EmployeeSummary) => {
    if (!window.confirm(`Reject access for ${employee.full_name}?`)) return
    setApprovalError(null)
    setRejecting(employee.id)
    try {
      await api.post(`/employees/${employee.id}/reject`)
      await reloadPending()
    } catch (err) {
      setApprovalError(err instanceof ApiError ? err.message : 'Unable to reject this request.')
    } finally {
      setRejecting(null)
    }
  }

  // Client-side counts & status filter
  const totalCount = data?.total ?? 0
  const presentCount = data?.items.filter((emp) => emp.today_status === 'PRESENT' || emp.today_status === 'HALF_DAY').length ?? 0
  const absentCount = Math.max(0, totalCount - presentCount)

  const filteredItems = useMemo(() => {
    return (data?.items ?? []).filter((emp) => {
      const isPresent = emp.today_status === 'PRESENT' || emp.today_status === 'HALF_DAY'
      if (statusFilter === 'ACTIVE') return isPresent
      if (statusFilter === 'INACTIVE') return !isPresent
      return true
    })
  }, [data?.items, statusFilter])

  // TanStack DataTable Column Definitions
  const columns = useMemo<ColumnDef<EmployeeSummary>[]>(
    () => [
      {
        accessorKey: 'full_name',
        header: 'Employee',
        cell: ({ row }) => {
          const emp = row.original
          return (
            <div className="min-w-0">
              <p className="truncate font-semibold text-ink hover:text-flow-600 transition-colors">
                {emp.full_name}
              </p>
              <p className="truncate text-xs text-away">{emp.email}</p>
            </div>
          )
        },
      },
      {
        accessorKey: 'employee_code',
        header: 'Employee ID',
        cell: ({ row }) => (
          <span className="inline-block rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-mono font-bold text-slate-700">
            {row.original.employee_code || 'Pending'}
          </span>
        ),
      },
      {
        accessorKey: 'department',
        header: 'Department',
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink">
            <Icon icon="mdi:domain" className="h-3.5 w-3.5 text-away" />
            {titleCase(row.original.department || 'Unassigned')}
          </span>
        ),
      },
      {
        accessorKey: 'designation',
        header: 'Designation',
        cell: ({ row }) => (
          <span className="text-xs text-slate-600 font-medium">
            {row.original.designation || 'Associate'}
          </span>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        accessorFn: (row) =>
          row.today_status === 'PRESENT' || row.today_status === 'HALF_DAY' ? 'Present' : 'Absent',
        cell: ({ row }) => {
          const isPresent = row.original.today_status === 'PRESENT' || row.original.today_status === 'HALF_DAY'
          return isPresent ? (
            <span className="inline-flex items-center justify-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200/80 shadow-xs">
              Present
            </span>
          ) : (
            <span className="inline-flex items-center justify-center rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700 border border-rose-200/80 shadow-xs">
              Absent
            </span>
          )
        },
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <div className="text-right">
            <Link
              to={`/admin/employees/${row.original.id}`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs transition-all hover:border-flow-400 hover:bg-flow-50 hover:text-flow-700"
            >
              <Icon icon="mdi:eye-outline" className="h-3.5 w-3.5" />
              <span>View Profile</span>
            </Link>
          </div>
        ),
        enableSorting: false,
      },
    ],
    [],
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader title="Employees" description="Manage team members, roles, and attendance." />
        <div className="flex items-center gap-2">
          <Link to="/admin/history">
            <Button variant="secondary" className="flex items-center gap-2 shadow-xs">
              <Icon icon="mdi:history" className="h-4 w-4 text-flow-600" />
              <span>Activity History</span>
            </Button>
          </Link>
          <Link to="/admin/employees/new">
            <Button className="flex items-center gap-2 shadow-xs">
              <Icon icon="mdi:account-plus-outline" className="h-4 w-4" />
              <span>Add Employee</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Compact Bento Status Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {/* Total Employees Bento Card */}
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
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Employees</span>
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-slate-100 text-slate-700">
              <Icon icon="mdi:account-group-outline" className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-ink">
              {loading && !data ? '—' : totalCount}
            </span>
            <span className="text-[11px] font-semibold text-away">All Members</span>
          </div>
        </div>

        {/* Present Today Bento Card */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setStatusFilter('ACTIVE')}
          className={`relative flex flex-col justify-between overflow-hidden rounded-xl border p-3.5 sm:p-4 transition-all cursor-pointer ${
            statusFilter === 'ACTIVE'
              ? 'border-emerald-500 bg-emerald-50/20 ring-2 ring-emerald-500/20 shadow-xs'
              : 'border-slate-200/80 bg-white hover:border-emerald-200 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Present</span>
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-100 text-emerald-700">
              <Icon icon="mdi:account-check-outline" className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-emerald-700">
              {loading && !data ? '—' : presentCount}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
              Present Today
            </span>
          </div>
        </div>

        {/* Absent Today Bento Card */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setStatusFilter('INACTIVE')}
          className={`relative flex flex-col justify-between overflow-hidden rounded-xl border p-3.5 sm:p-4 transition-all cursor-pointer ${
            statusFilter === 'INACTIVE'
              ? 'border-rose-500 bg-rose-50/20 ring-2 ring-rose-500/20 shadow-xs'
              : 'border-slate-200/80 bg-white hover:border-rose-200 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700">Absent</span>
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-rose-100 text-rose-700">
              <Icon icon="mdi:account-remove-outline" className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-rose-700">
              {loading && !data ? '—' : absentCount}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600">
              Absent Today
            </span>
          </div>
        </div>
      </div>

      {/* Pending Access Requests */}
      {pending && pending.items.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/30">
          <CardHeader
            title="Pending Access Requests"
            subtitle="Review registered employees and assign their ID code before granting access."
          />
          {approvalError && (
            <div className="px-5 pt-3">
              <p className="rounded-xl bg-absent-soft px-3.5 py-2.5 text-xs font-semibold text-absent">
                {approvalError}
              </p>
            </div>
          )}
          <ul className="divide-y divide-amber-100">
            {pending.items.map((employee) => (
              <li key={employee.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-ink">{employee.full_name}</p>
                  <p className="truncate text-xs text-away">{employee.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    className="w-48 text-xs font-medium"
                    value={assignment[employee.id] ?? 'overall'}
                    onChange={(e) => setAssignment({ ...assignment, [employee.id]: e.target.value })}
                    aria-label={`Employee ID scope for ${employee.full_name}`}
                  >
                    <option value="overall">General Organization ID</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name} ({dept.code})
                      </option>
                    ))}
                  </Select>
                  <Button
                    size="sm"
                    onClick={() => approve(employee)}
                    className="flex items-center gap-1 text-xs"
                  >
                    <Icon icon="mdi:check" className="h-3.5 w-3.5" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => reject(employee)}
                    loading={rejecting === employee.id}
                    className="flex items-center gap-1 text-xs"
                  >
                    <Icon icon="mdi:close" className="h-3.5 w-3.5" />
                    Reject
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Controls Bar: Filters on Left, Search on Right */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        {/* Left Side: Department & Status Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Select
            value={department}
            onChange={(e) => {
              setDepartment(e.target.value)
              setPage(1)
            }}
            className="w-full text-xs font-medium sm:w-44"
          >
            <option value="">All Departments</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.name}>
                {titleCase(dept.name)}
              </option>
            ))}
          </Select>

          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE')}
            className="w-full text-xs font-medium sm:w-36"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Present Only</option>
            <option value="INACTIVE">Absent Only</option>
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
            placeholder="Search employees..."
            className="pl-10 text-xs py-2"
          />
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && !data && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-4">
            {[0, 1, 2, 3, 4].map((n) => (
              <Skeleton key={n} className="h-12 w-full rounded-xl" />
            ))}
          </div>
        </div>
      )}

      {/* Error state */}
      {error && <ErrorState message={error} onRetry={reload} />}

      {/* ======================================================== */}
      {/* TanStack Data Table View                                 */}
      {/* ======================================================== */}
      {data && (
        <DataTable
          columns={columns}
          data={filteredItems}
          totalCount={data.total}
          emptyMessage="No employees found matching your criteria."
        />
      )}
    </div>
  )
}
