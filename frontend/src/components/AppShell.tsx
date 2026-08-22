import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  BarChart3,
  CalendarCheck,
  CalendarDays,
  LayoutDashboard,
  LogOut,
  Menu,
  Users,
  UserRound,
  Wallet,
  X,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useRealtime } from '@/context/RealtimeContext'
import { LiveBadge } from '@/components/LiveBadge'
import { NotificationBell } from '@/components/NotificationBell'
import { initials } from '@/lib/format'
import { cx } from '@/components/ui/Primitives'

interface NavItem {
  to: string
  label: string
  icon: typeof LayoutDashboard
  adminOnly?: boolean
  badge?: string | number
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/attendance', label: 'My Attendance', icon: CalendarDays },
  { to: '/leave', label: 'My Leaves', icon: CalendarCheck },
  { to: '/payroll', label: 'My Payroll', icon: Wallet },
  { to: '/profile', label: 'My Profile', icon: UserRound },
  { to: '/admin/employees', label: 'Employees', icon: Users, adminOnly: true },
  { to: '/admin/attendance', label: 'Attendance Board', icon: CalendarDays, adminOnly: true },
  { to: '/admin/leave', label: 'Leave Approvals', icon: CalendarCheck, adminOnly: true },
  { to: '/admin/payroll', label: 'Payroll Admin', icon: Wallet, adminOnly: true },
  { to: '/admin/insights', label: 'Insights', icon: BarChart3, adminOnly: true },
]

export function AppShell() {
  const { session, isAdmin, signOut } = useAuth()
  const { connected } = useRealtime()
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  const handleSignOut = async () => {
    await signOut()
    navigate('/signin', { replace: true })
  }

  const items = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin)

  const link = (item: NavItem, mobile = false) => {
    const Icon = item.icon
    return (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.to === '/dashboard'}
        className={({ isActive }) =>
          cx(
            'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors',
            isActive
              ? 'bg-flow-500 text-white shadow-sm'
              : 'text-white/70 hover:bg-white/5 hover:text-white',
            mobile && 'text-base',
          )
        }
      >
        <Icon className="h-5 w-5 shrink-0" aria-hidden />
        <span className="truncate">{item.label}</span>
        {item.badge !== undefined && (
          <span className="ml-auto rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold text-white">
            {item.badge}
          </span>
        )}
      </NavLink>
    )
  }

  const brand = (
    <Link to="/" className="flex items-center">
      <img src="/tecryst-logo-white.png" alt="TeCryst" className="h-8 w-auto object-contain" />
    </Link>
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
          <div className="flex items-center gap-2.5 px-2 py-2">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 text-xs font-bold text-white">
              {initials(session?.full_name ?? '')}
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-sm font-semibold text-white">{session?.full_name}</span>
              <span className="block truncate text-[11px] text-white/50">
                {isAdmin ? 'HR administrator' : session?.designation}
              </span>
            </span>
          </div>
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
            <button
              type="button"
              onClick={handleSignOut}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/60 hover:bg-white/5 hover:text-white"
            >
              <LogOut className="h-[18px] w-[18px]" aria-hidden />
              Sign out
            </button>
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
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
            <LiveBadge className="hidden sm:inline-flex" />
            <NotificationBell />
            <span className="hidden h-9 w-9 place-items-center rounded-full bg-flow-50 text-xs font-bold text-flow-600 sm:grid">
              {initials(session?.full_name ?? '')}
            </span>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 pb-24 lg:px-8 lg:py-8 lg:pb-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
