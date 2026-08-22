import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { Icon } from '@iconify/react'
import { ApiError, api } from '@/api/client'
import type { Department } from '@/api/types'
import { PageHeader } from '@/components/PageHeader'
import { Button, ErrorState, Field, FormBanner, Input, Select, Skeleton } from '@/components/ui/Primitives'
import { DataTable } from '@/components/ui/DataTable'
import { titleCase } from '@/lib/format'

export default function DepartmentCreation() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL')

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [modalError, setModalError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.get<Department[]>('/employees/departments')
      setDepartments(data)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load departments.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const create = async (event: FormEvent) => {
    event.preventDefault()
    setModalError(null)
    setSaving(true)
    try {
      const department = await api.post<Department>('/employees/departments', {
        name: name.trim(),
        code: code.trim().toUpperCase(),
      })
      setDepartments((current) => [...current, department].sort((a, b) => a.name.localeCompare(b.name)))
      setName('')
      setCode('')
      setIsModalOpen(false)
    } catch (err) {
      setModalError(err instanceof ApiError ? err.message : 'Unable to create this department.')
    } finally {
      setSaving(false)
    }
  }

  // Filtered Items
  const filteredItems = useMemo(() => {
    return departments.filter((dept) => {
      const matchesSearch =
        search === '' ||
        dept.name.toLowerCase().includes(search.toLowerCase()) ||
        dept.code.toLowerCase().includes(search.toLowerCase())

      const isActive = dept.is_active !== false
      if (statusFilter === 'ACTIVE' && !isActive) return false
      if (statusFilter === 'INACTIVE' && isActive) return false
      return matchesSearch
    })
  }, [departments, search, statusFilter])

  // TanStack DataTable Columns
  const columns = useMemo<ColumnDef<Department>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Department Name',
        cell: ({ row }) => (
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-flow-50 text-flow-600 border border-flow-100">
              <Icon icon="mdi:domain" className="h-4 w-4" />
            </span>
            <div>
              <p className="font-semibold text-ink hover:text-flow-600 transition-colors">
                {titleCase(row.original.name)}
              </p>
              <p className="text-xs text-away">Org Unit #{row.original.id}</p>
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'code',
        header: 'Department Code',
        cell: ({ row }) => (
          <span className="inline-block rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-mono font-bold text-slate-700">
            {row.original.code}
          </span>
        ),
      },
      {
        accessorKey: 'next_employee_number',
        header: 'Next Employee ID',
        cell: ({ row }) => {
          const formattedNumber = String(row.original.next_employee_number || 1).padStart(4, '0')
          return (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-flow-50/80 px-2.5 py-1 text-xs font-mono font-bold text-flow-700 border border-flow-100">
              <Icon icon="mdi:tag-outline" className="h-3.5 w-3.5 text-flow-500" />
              {row.original.code}-{formattedNumber}
            </span>
          )
        },
      },
      {
        id: 'status',
        header: 'Status',
        accessorFn: (row) => (row.is_active !== false ? 'Active' : 'Inactive'),
        cell: ({ row }) => {
          const isActive = row.original.is_active !== false
          return isActive ? (
            <span className="inline-flex items-center justify-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200/80 shadow-xs">
              Active
            </span>
          ) : (
            <span className="inline-flex items-center justify-center rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 border border-slate-200 shadow-xs">
              Inactive
            </span>
          )
        },
      },
    ],
    [],
  )

  return (
    <div className="space-y-6">
      {/* Header with Title, Total Count, and Add Department Button */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <PageHeader title="Departments" />
          {!loading && (
            <div className="inline-flex items-center gap-1.5 self-start px-2 py-1 sm:self-auto">
              <Icon icon="mdi:domain" className="h-4 w-4 text-away" />
              <span className="text-xs font-medium text-away">
                Total: <strong className="font-bold text-ink">{departments.length}</strong>
              </span>
            </div>
          )}
        </div>
        <Button
          onClick={() => {
            setModalError(null)
            setIsModalOpen(true)
          }}
          className="flex items-center gap-1.5 text-xs font-bold self-start sm:self-auto shadow-xs"
        >
          <Icon icon="mdi:plus" className="h-4 w-4" />
          <span>Add Department</span>
        </Button>
      </div>

      {/* Controls Bar: Filters on Left, Search on Right */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        {/* Left Side: Status Filter */}
        <div className="flex items-center gap-2">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE')}
            className="w-full text-xs font-medium sm:w-40"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Inactive Only</option>
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
            placeholder="Search departments or codes..."
            className="pl-10 text-xs py-2"
          />
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-4">
            {[0, 1, 2, 3].map((n) => (
              <Skeleton key={n} className="h-12 w-full rounded-xl" />
            ))}
          </div>
        </div>
      )}

      {/* Error state */}
      {error && <ErrorState message={error} onRetry={load} />}

      {/* TanStack Data Table View */}
      {!loading && !error && (
        <DataTable
          columns={columns}
          data={filteredItems}
          totalCount={departments.length}
          emptyMessage="No departments found matching your search."
        />
      )}

      {/* ======================================================== */}
      {/* Create Department Modal Dialog                           */}
      {/* ======================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white p-6 shadow-2xl border border-slate-150 animate-in zoom-in-95 duration-150"
            role="dialog"
            aria-modal="true"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-flow-50 text-flow-600 border border-flow-100">
                  <Icon icon="mdi:domain-plus" className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-ink">Add Department</h3>
                  <p className="text-xs text-away">Create a new organizational department</p>
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

            {/* Form */}
            <form onSubmit={create} className="space-y-4 pt-4">
              <FormBanner message={modalError} />

              <Field label="Department Name" htmlFor="modal-dept-name" required>
                <Input
                  id="modal-dept-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Engineering, Human Resources, Finance"
                  required
                  className="text-sm"
                  autoFocus
                />
              </Field>

              <Field
                label="Department Code"
                htmlFor="modal-dept-code"
                hint="2 to 8 uppercase letters (e.g. ENG, HR, FIN, MKT)"
                required
              >
                <Input
                  id="modal-dept-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. ENG"
                  pattern="[A-Z]{2,8}"
                  required
                  className="font-mono uppercase text-sm"
                />
              </Field>

              {/* Realtime ID Preview */}
              {code && (
                <div className="rounded-xl bg-slate-50 p-3 border border-slate-200/80">
                  <span className="text-[11px] font-semibold text-away block mb-1">
                    Employee ID Prefix Preview:
                  </span>
                  <span className="inline-block rounded-md bg-flow-100/70 px-2 py-0.5 text-xs font-mono font-bold text-flow-800">
                    {code.trim().toUpperCase()}-0001
                  </span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
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
                  loading={saving}
                  className="flex items-center gap-1.5 text-xs font-bold"
                >
                  <Icon icon="mdi:check" className="h-4 w-4" />
                  <span>Create Department</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}