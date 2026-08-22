import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '@/context/AuthContext'

function Splash() {
  return (
    <div className="grid min-h-screen place-items-center bg-paper">
      <div className="flex flex-col items-center gap-3">
        <span className="grid h-11 w-11 animate-pulse place-items-center rounded-xl bg-flow-500 text-lg font-bold text-white">
          D
        </span>
        <p className="text-sm text-away">Opening your workspace…</p>
      </div>
    </div>
  )
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()
  const location = useLocation()
  if (loading) return <Splash />
  if (!session) return <Navigate to="/signin" state={{ from: location.pathname }} replace />
  return <>{children}</>
}

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { session, loading, isAdmin } = useAuth()
  if (loading) return <Splash />
  if (!session) return <Navigate to="/signin" replace />
  if (!isAdmin) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

export function RedirectIfSignedIn({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) return <Splash />
  if (session) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}
