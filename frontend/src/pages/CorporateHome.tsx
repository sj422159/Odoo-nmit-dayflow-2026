import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  Building2,
  CheckCircle2,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Plus,
  Search,
  Shield,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react'
import { type ColumnDef } from '@tanstack/react-table'
import { useNavigate } from 'react-router-dom'
import Swal from 'sweetalert2'
import { ApiError, api } from '@/api/client'
import type { CorporateSummary, HROfficer } from '@/api/types'
import { PageHeader } from '@/components/PageHeader'
import {
  Button,
  Card,
  Field,
  FormBanner,
  Input,
  Skeleton,
} from '@/components/ui/Primitives'

import { DataTable } from '@/components/ui/DataTable'
import { useAuth } from '@/context/AuthContext'
import { fmtDate } from '@/lib/format'

type Tab = 'dashboard' | 'hr-list' | 'hr-create'

export default function CorporateHome() {
  const { session, signOut } = useAuth()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState<Tab>('dashboard')

  // Data States
  const [summary, setSummary] = useState<CorporateSummary | null>(null)
  const [hrAdmins, setHrAdmins] = useState<HROfficer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Form States (From Screenshot)
  const [adminFirst, setAdminFirst] = useState('')
  const [adminLast, setAdminLast] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [adminConfirm, setAdminConfirm] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Load Corporate Data
  const loadData = useCallback(async () => {
    try {
      const [sumRes, hrRes] = await Promise.all([
        api.get<CorporateSummary>('/auth/corporate-summary'),
        api.get<HROfficer[]>('/auth/hr-admins'),
      ])
      setSummary(sumRes)
      setHrAdmins(hrRes)
    } catch {
      // Ignore if unauthenticated
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleSignOut = () => {
    signOut()
    navigate('/corporate/signin', { replace: true })
  }

  // Create HR Administrator
  const createAdmin = async (event: FormEvent) => {
    event.preventDefault()
    setFormError(null)

    if (adminPassword !== adminConfirm) {
      setFormError('Both passwords need to match.')
      return
    }

    setSubmitting(true)
    try {
      const result = await api.post<{ message: string }>('/auth/admins', {
        email: adminEmail.trim(),
        password: adminPassword,
        confirm_password: adminConfirm,
        first_name: adminFirst.trim(),
        last_name: adminLast.trim(),
      })

      Swal.fire({
        icon: 'success',
        title: 'HR Administrator Created!',
        text: result.message || `HR access granted for ${adminEmail}.`,
        timer: 2500,
        showConfirmButton: false,
      })

      // Reset form
      setAdminFirst('')
      setAdminLast('')
      setAdminEmail('')
      setAdminPassword('')
      setAdminConfirm('')

      // Refresh list & switch to list tab
      await loadData()
      setActiveTab('hr-list')
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Unable to create HR admin.')
    } finally {
      setSubmitting(false)
    }
  }

  // Delete HR Admin
  const handleDeleteHr = async (hr: HROfficer) => {
    const confirm = await Swal.fire({
      title: 'Revoke HR Access?',
      text: `Are you sure you want to remove HR administrator ${hr.full_name} (${hr.email})?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, Revoke Access',
    })

    if (confirm.isConfirmed) {
      try {
        await api.delete(`/auth/hr-admins/${hr.id}`)
        Swal.fire({
          icon: 'success',
          title: 'Access Revoked',
          text: `HR administrator ${hr.full_name} has been removed.`,
          timer: 2000,
          showConfirmButton: false,
        })
        loadData()
      } catch {
        Swal.fire({
          icon: 'error',
          title: 'Action Failed',
          text: 'Unable to revoke HR access.',
        })
      }
    }
  }

  // Filtered HR Admins
  const filteredHrAdmins = useMemo(() => {
    return hrAdmins.filter((hr) => {
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return (
        hr.full_name.toLowerCase().includes(q) ||
        hr.email.toLowerCase().includes(q) ||
        hr.hr_code.toLowerCase().includes(q)
      )
    })
  }, [hrAdmins, search])

  // HR Table Columns
  const hrColumns = useMemo<ColumnDef<HROfficer>[]>(
    () => [
      {
        accessorKey: 'hr_code',
        header: 'HR Code',
        cell: ({ row }) => (
          <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded-md">
            {row.original.hr_code}
          </span>
        ),
      },
      {
        accessorKey: 'full_name',
        header: 'HR Administrator Name',
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
              {row.original.first_name?.[0]}
              {row.original.last_name?.[0]}
            </div>
            <div>
              <p className="font-bold text-xs text-slate-900">{row.original.full_name}</p>
              <p className="text-[11px] text-slate-500">{row.original.email}</p>
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'department',
        header: 'Department / Organization',
        cell: ({ row }) => (
          <span className="text-xs font-semibold text-slate-700">
            {row.original.department || 'Human Resources'}
          </span>
        ),
      },
      {
        accessorKey: 'created_at',
        header: 'Enrolled Date',
        cell: ({ row }) => (
          <span className="text-xs text-slate-500">{fmtDate(row.original.created_at, 'MMM d, yyyy')}</span>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        cell: () => (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
            Active HR
          </span>
        ),
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <div className="text-right">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDeleteHr(row.original)}
              className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 text-xs font-semibold"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Revoke
            </Button>
          </div>
        ),
        enableSorting: false,
      },
    ],
    [],
  )

  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      {/* Corporate Left Sidebar Navigation */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col justify-between bg-slate-900 px-4 py-6 lg:flex text-white">
        <div>
          {/* Logo Branding */}
          <div className="flex items-center gap-3 px-2 pb-8 border-b border-slate-800">
            <img src="/tecryst-logo-white.png" alt="TeCryst Corporate" className="h-8 w-auto object-contain" />
            <span className="text-xs font-bold uppercase tracking-wider text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded-md border border-blue-800/50">
              Corporate Portal
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="mt-6 space-y-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <LayoutDashboard className="h-4 w-4 shrink-0" />
              <span>Dashboard</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('hr-list')}
              className={`w-full flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'hr-list' || activeTab === 'hr-create'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Users className="h-4 w-4 shrink-0" />
                <span>HR Administrators</span>
              </div>
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-bold">
                {summary?.total_hr_admins ?? 0}
              </span>
            </button>
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="border-t border-slate-800 pt-4 space-y-3">
          <div className="flex items-center gap-3 px-2">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-blue-600 text-xs font-bold text-white shadow-xs">
              CA
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-white">{session?.full_name || 'Corporate Admin'}</p>
              <p className="truncate text-[11px] text-slate-400">System Executive</p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="w-full justify-start text-slate-400 hover:bg-slate-800 hover:text-white font-semibold text-xs gap-2"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign out</span>
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Header */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/90 px-6 py-3.5 backdrop-blur">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <span>Corporate Portal</span>
            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            <span className="font-bold text-slate-900 capitalize">
              {activeTab === 'dashboard' ? 'Dashboard Overview' : 'HR Administrators'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              Corporate Verified Access
            </span>
          </div>
        </header>

        {/* Body View Container */}
        <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
          {/* Loading Skeleton */}
          {loading && (
            <div className="space-y-4">
              <Skeleton className="h-10 w-64" />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Skeleton className="h-28" />
                <Skeleton className="h-28" />
                <Skeleton className="h-28" />
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 1: CORPORATE DASHBOARD OVERVIEW                       */}
          {/* ======================================================== */}
          {!loading && activeTab === 'dashboard' && (
            <div className="space-y-6">
              <PageHeader
                title="Corporate Overview"
                description="System-wide metrics across enrolled employees, HR administrators, and organizations."
              />

              {/* Bento Stat Cards */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {/* Total Employees Enrolled Card */}
                <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-700">
                      Total Employees Enrolled
                    </span>
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50 text-blue-700 border border-blue-100">
                      <Users className="h-5 w-5" />
                    </span>
                  </div>
                  <div className="mt-4 flex items-baseline justify-between">
                    <span className="text-3xl font-black tracking-tight text-slate-900">
                      {summary?.total_employees ?? 0}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-600">
                      Active Workforce
                    </span>
                  </div>
                </div>

                {/* Total HR Administrators Card */}
                <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">
                      HR Administrators
                    </span>
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100">
                      <UserPlus className="h-5 w-5" />
                    </span>
                  </div>
                  <div className="mt-4 flex items-baseline justify-between">
                    <span className="text-3xl font-black tracking-tight text-slate-900">
                      {summary?.total_hr_admins ?? 0}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600">
                      Enrolled Admins
                    </span>
                  </div>
                </div>

                {/* Total Organizations Card */}
                <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                      Organizations / Depts
                    </span>
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100">
                      <Building2 className="h-5 w-5" />
                    </span>
                  </div>
                  <div className="mt-4 flex items-baseline justify-between">
                    <span className="text-3xl font-black tracking-tight text-slate-900">
                      {summary?.total_departments ?? 0}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                      Active Entities
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Actions & Recent Enrolled HR Preview */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                {/* Left Card: Quick Action */}
                <Card className="p-6 lg:col-span-4 flex flex-col justify-between border border-slate-200">
                  <div>
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600 text-white shadow-xs mb-3">
                      <Shield className="h-5 w-5" />
                    </span>
                    <h3 className="text-base font-bold text-slate-900">Add HR Administrator</h3>
                    <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                      Provision new HR officer accounts with full administrative control over employee onboarding, attendance, and payroll.
                    </p>
                  </div>
                  <Button
                    onClick={() => setActiveTab('hr-create')}
                    className="mt-6 w-full font-bold flex items-center justify-center gap-2"
                  >
                    <UserPlus className="h-4 w-4" />
                    <span>Create New HR Admin</span>
                  </Button>
                </Card>

                {/* Right Card: Recent Enrolled HR Admins Table */}
                <Card className="p-6 lg:col-span-8 border border-slate-200">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                    <h3 className="text-base font-bold text-slate-900">Recently Enrolled HR Administrators</h3>
                    <button
                      type="button"
                      onClick={() => setActiveTab('hr-list')}
                      className="text-xs font-bold text-blue-600 hover:text-blue-800"
                    >
                      View All ({hrAdmins.length})
                    </button>
                  </div>

                  <div className="space-y-3">
                    {hrAdmins.slice(0, 4).map((hr) => (
                      <div
                        key={hr.id}
                        className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="grid h-9 w-9 place-items-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                            {hr.first_name?.[0]}
                            {hr.last_name?.[0]}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900">{hr.full_name}</p>
                            <p className="text-[11px] text-slate-500">{hr.email}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-mono text-[11px] font-bold text-slate-600 bg-slate-200/70 px-2 py-0.5 rounded-md">
                            {hr.hr_code}
                          </span>
                        </div>
                      </div>
                    ))}
                    {hrAdmins.length === 0 && (
                      <p className="py-6 text-center text-xs text-slate-500">No HR administrators enrolled yet.</p>
                    )}
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: HR ADMINISTRATORS DATATABLE LISTING               */}
          {/* ======================================================== */}
          {!loading && activeTab === 'hr-list' && (
            <div className="space-y-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <PageHeader
                  title="HR Administrators"
                  description="Enrolled HR officers and organization administrators in Dayflow HRMS."
                />
                <Button
                  onClick={() => setActiveTab('hr-create')}
                  className="font-bold flex items-center gap-2 px-5 self-start sm:self-auto"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add HR Administrator</span>
                </Button>
              </div>

              {/* Controls Bar */}
              <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <span className="text-xs font-bold text-slate-900">
                  Total Enrolled: {hrAdmins.length} HR Administrators
                </span>
                <div className="relative w-full sm:w-72">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search HR name, email, code..."
                    className="pl-10 text-xs py-2"
                  />
                </div>
              </div>

              {/* DataTable */}
              <DataTable
                columns={hrColumns}
                data={filteredHrAdmins}
                totalCount={hrAdmins.length}
                emptyMessage="No HR administrators found."
              />
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3: ADD HR ADMINISTRATOR FORM (EXACT SCREENSHOT DESIGN) */}
          {/* ======================================================== */}
          {!loading && activeTab === 'hr-create' && (
            <div className="space-y-6 max-w-3xl">
              <div className="flex items-center justify-between">
                <PageHeader
                  title="Add HR Administrator"
                  description="Provision a new HR officer account with company administrative credentials."
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setActiveTab('hr-list')}
                  className="font-semibold text-xs"
                >
                  Back to HR List
                </Button>
              </div>

              {/* Exact Card Design matching User's Screenshot */}
              <Card className="border border-slate-200/90 shadow-sm rounded-2xl overflow-hidden bg-white">
                <div className="p-6 border-b border-slate-100">
                  <h2 className="text-lg font-bold text-slate-900">Add HR administrator</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Only corporate administrators can create HR access.
                  </p>
                </div>

                <form onSubmit={createAdmin} className="p-6 space-y-5">
                  <FormBanner message={formError} />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="First name *" htmlFor="admin-first">
                      <Input
                        id="admin-first"
                        value={adminFirst}
                        onChange={(e) => setAdminFirst(e.target.value)}
                        placeholder="Enter first name"
                        required
                        className="rounded-xl border-slate-200 text-xs font-semibold py-2.5"
                      />
                    </Field>

                    <Field label="Last name *" htmlFor="admin-last">
                      <Input
                        id="admin-last"
                        value={adminLast}
                        onChange={(e) => setAdminLast(e.target.value)}
                        placeholder="Enter last name"
                        required
                        className="rounded-xl border-slate-200 text-xs font-semibold py-2.5"
                      />
                    </Field>
                  </div>

                  <Field label="Work email *" htmlFor="admin-email">
                    <Input
                      id="admin-email"
                      type="email"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      placeholder="e.g. hr@company.com"
                      required
                      className="rounded-xl border-slate-200 text-xs font-semibold py-2.5"
                    />
                  </Field>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Temporary password *" htmlFor="admin-password">
                      <Input
                        id="admin-password"
                        type="password"
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        placeholder="Min 10 characters"
                        required
                        className="rounded-xl border-slate-200 text-xs font-semibold py-2.5"
                      />
                    </Field>

                    <Field label="Repeat password *" htmlFor="admin-confirm">
                      <Input
                        id="admin-confirm"
                        type="password"
                        value={adminConfirm}
                        onChange={(e) => setAdminConfirm(e.target.value)}
                        placeholder="Confirm password"
                        required
                        className="rounded-xl border-slate-200 text-xs font-semibold py-2.5"
                      />
                    </Field>
                  </div>

                  <div className="pt-2">
                    <Button
                      type="submit"
                      loading={submitting}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl px-6 py-2.5 flex items-center gap-2 text-xs shadow-xs"
                    >
                      <UserPlus className="h-4 w-4" />
                      <span>Create HR admin</span>
                    </Button>
                  </div>
                </form>
              </Card>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
