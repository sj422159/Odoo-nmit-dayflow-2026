import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  BarChart3,
  CalendarCheck,
  CalendarDays,
  Building2,
  LayoutDashboard,

  LogOut,
  Menu,
  Users,
  UserRound,
  Wallet,
  Settings,
  X,

} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useRealtime } from '@/context/RealtimeContext'
import { api } from '@/api/client'
import { MessageSquare } from 'lucide-react'
import type { EmployeeSummary, Paginated } from '@/api/types'
import { NotificationBell } from '@/components/NotificationBell'
import { HeaderHistoryPanel } from '@/components/HeaderHistoryPanel'
import { HeaderChatButton } from '@/components/HeaderChatButton'
import { OfflineBanner } from '@/components/OfflineBanner'
import { PWAInstallButton } from '@/components/PWAInstallButton'
import { initials } from '@/lib/format'


import { cx } from '@/components/ui/Primitives'

interface NavItem {
  to: string
  label: string
  icon: typeof LayoutDashboard
  end?: boolean
  badge?: 'pending' | 'access'
}

const EMPLOYEE_NAV: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/attendance', label: 'Attendance', icon: CalendarCheck },
  { to: '/leave', label: 'Time off', icon: CalendarDays },
  { to: '/holidays', label: 'Holidays', icon: CalendarDays },
  { to: '/payroll', label: 'Pay', icon: Wallet },
  { to: '/chat', label: 'Messages', icon: MessageSquare },
]

const ADMIN_NAV: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/employees', label: 'Employees', icon: Users, badge: 'access' },
  { to: '/admin/departments', label: 'Departments', icon: Building2 },
  { to: '/admin/attendance', label: 'Attendance', icon: CalendarCheck },
  { to: '/admin/leave', label: 'Approvals', icon: CalendarDays, badge: 'pending' },
  { to: '/holidays', label: 'Holidays', icon: CalendarDays },
  { to: '/admin/payroll', label: 'Payroll', icon: Wallet },
  { to: '/chat', label: 'Messages', icon: MessageSquare },
  { to: '/admin/insights', label: 'Insights', icon: BarChart3 },
]






export function AppShell() {
  const { session, isAdmin, signOut } = useAuth()
  const { snapshot, subscribe } = useRealtime()
  const [menuOpen, setMenuOpen] = useState(false)
  const [pendingAccess, setPendingAccess] = useState(0)
  const [avatarErr, setAvatarErr] = useState(false)
  const location = useLocation()

  const navigate = useNavigate()

  const items = isAdmin ? ADMIN_NAV : EMPLOYEE_NAV
  const pending = snapshot.pending_leave_requests ?? 0

  useEffect(() => {
    if (!isAdmin) return
    const load = () => {
      api.get<Paginated<EmployeeSummary>>('/employees/pending-access')
        .then((result) => setPendingAccess(result.total))
        .catch(() => setPendingAccess(0))
    }
    load()
    return subscribe((event) => {
      if (event.event === 'employee.access_approved' || event.event === 'employee.access_rejected') load()
    })
  }, [isAdmin, subscribe])

  useEffect(() => setMenuOpen(false), [location.pathname])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  const handleSignOut = () => {
    signOut()
    navigate('/signin', { replace: true })
  }

  const link = (item: NavItem, compact = false) => {
    const Icon = item.icon
    const count = item.badge === 'pending' ? pending : item.badge === 'access' ? pendingAccess : 0
    return (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.end}
        className={({ isActive }) =>
          cx(
            'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors',
            compact ? 'w-full' : '',
            isActive
              ? 'bg-white/10 text-white'
              : 'text-white/60 hover:bg-white/5 hover:text-white',
          )
        }
      >
        <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
        <span className="flex-1">{item.label}</span>
        {count > 0 && (
          <span className="rounded-full bg-pending px-1.5 py-0.5 text-[10px] font-bold text-white tabular">
            {count}
          </span>
        )}
      </NavLink>
    )
  }

  const brand = (
    <div className="flex items-center gap-2.5">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-flow-500 text-sm font-bold text-white">
        D
      </span>
      <span className="leading-tight">
        <span className="block text-sm font-bold tracking-tight text-white">Dayflow</span>
        <span className="block text-[11px] text-white/50">Every workday, aligned</span>
      </span>
    </div>
  )

  return (
    <div className="min-h-screen bg-paper lg:flex">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col justify-between bg-ink px-3 py-5 lg:flex">
        <div>
          <div className="px-2 pb-6">{brand}</div>
          <nav className="flex flex-col gap-1">{items.map((item) => link(item))}</nav>
        </div>
        <div className="border-t border-white/10 pt-3">
          <PWAInstallButton variant="sidebar" />
          <Link
            to="/profile"

            className="flex items-center justify-between rounded-xl px-2.5 py-2 text-white/80 transition-all hover:bg-white/10 hover:text-white group"
            title="View & Edit Profile"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 text-xs font-bold text-white group-hover:bg-flow-600 transition-colors">
                {initials(session?.full_name ?? '')}
              </span>
              <span className="min-w-0 leading-tight">
                <span className="block truncate text-sm font-semibold text-white">{session?.full_name}</span>
                <span className="block truncate text-[11px] text-white/50">
                  {isAdmin ? 'HR administrator' : session?.designation}
                </span>
              </span>
            </div>
            <UserRound className="h-4 w-4 shrink-0 text-white/40 group-hover:text-white transition-colors" />
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/60 transition-colors hover:bg-white/5 hover:text-white"
          >
            <LogOut className="h-[18px] w-[18px]" aria-hidden />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-ink/50"
            onClick={() => setMenuOpen(false)}
            aria-hidden
          />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col justify-between bg-ink px-3 py-5 animate-fade-up">
            <div>
              <div className="flex items-center justify-between px-2 pb-6">
                {brand}
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  aria-label="Close menu"
                  className="rounded-lg p-1.5 text-white/70 hover:bg-white/10"
                >
                  <X className="h-5 w-5" aria-hidden />
                </button>
              </div>
              <nav className="flex flex-col gap-1">{items.map((item) => link(item, true))}</nav>
            </div>
            <div className="border-t border-white/10 pt-3">
              <Link
                to="/profile"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/80 hover:bg-white/10 hover:text-white mb-1"
              >
                <UserRound className="h-[18px] w-[18px]" aria-hidden />
                Profile
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/60 hover:bg-white/5 hover:text-white"
              >
                <LogOut className="h-[18px] w-[18px]" aria-hidden />
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <OfflineBanner />

        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-150 bg-white/85 px-4 py-3 backdrop-blur lg:px-8">

          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            className="rounded-xl p-2 text-ink-600 hover:bg-slate-150 lg:hidden"
          >
            <Menu className="h-5 w-5" aria-hidden />
          </button>
          <Link to="/" className="flex items-center lg:hidden">
            <img src="/tecryst-logo-dark.png" alt="TeCryst" className="h-7 w-auto object-contain" />
          </Link>
          <div className="ml-auto flex items-center gap-3">

            <PWAInstallButton variant="header" />
            <HeaderChatButton />
            <HeaderHistoryPanel />
            <NotificationBell />

            {isAdmin && (
              <Link
                to="/admin/settings"
                title="Company Settings"
                className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-all hover:bg-slate-50 hover:text-slate-900 shadow-2xs"
              >
                <Settings className="h-4 w-4" />
              </Link>
            )}



            <Link
              to="/profile"
              title="View Profile"
              className="hidden h-9 w-9 place-items-center overflow-hidden rounded-full bg-flow-50 text-xs font-bold text-flow-600 ring-2 ring-slate-200 transition-all hover:bg-flow-100 hover:ring-flow-400 sm:grid"
            >
              {session?.avatar_url && !avatarErr ? (
                <img
                  src={session.avatar_url}
                  alt={session.full_name}
                  onError={() => setAvatarErr(true)}
                  className="h-full w-full object-cover"
                />
              ) : (
                initials(session?.full_name ?? '')
              )}
            </Link>

          </div>
        </header>


        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 pb-24 lg:px-8 lg:py-8 lg:pb-8">
          <Outlet />
        </main>

        {/* Mobile tab bar — the five destinations people actually use daily */}
        <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-slate-150 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
          {items.slice(0, 5).map((item) => {
            const Icon = item.icon
            const count = item.badge === 'pending' ? pending : item.badge === 'access' ? pendingAccess : 0
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cx(
                    'relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition-colors',
                    isActive ? 'text-flow-600' : 'text-away',
                  )
                }
              >
                <Icon className="h-5 w-5" aria-hidden />
                {item.label}
                {count > 0 && (
                  <span className="absolute right-[22%] top-1.5 h-4 min-w-[16px] rounded-full bg-pending px-1 text-[10px] font-bold leading-4 text-white tabular">
                    {count}
                  </span>
                )}
              </NavLink>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
