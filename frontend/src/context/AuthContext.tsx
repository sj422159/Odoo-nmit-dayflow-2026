import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { api, tokens } from '@/api/client'
import type { AccountType, Session, TokenPair } from '@/api/types'

interface AuthValue {
  session: Session | null
  loading: boolean
  isAdmin: boolean
  isCorpAdmin: boolean
  isHR: boolean
  isEmployee: boolean
  signIn: (email: string, password: string, accountType?: AccountType) => Promise<void>
  signOut: () => void
  refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  const loadSession = useCallback(async () => {
    if (!tokens.access()) {
      setSession(null)
      setLoading(false)
      return
    }
    try {
      setSession(await api.get<Session>('/auth/me'))
    } catch {
      tokens.clear()
      setSession(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadSession()
    const onSignedOut = () => setSession(null)
    window.addEventListener('dayflow:signed-out', onSignedOut)
    return () => window.removeEventListener('dayflow:signed-out', onSignedOut)
  }, [loadSession])

  const signIn = useCallback(
    async (email: string, password: string, accountType?: AccountType) => {
      let endpoint = '/auth/login'
      if (accountType === 'corp_admin') endpoint = '/auth/corp-admin/login'
      else if (accountType === 'hr') endpoint = '/auth/hr/login'
      else if (accountType === 'employee') endpoint = '/auth/employee/login'

      const pair = await api.public.post<TokenPair>(endpoint, { email, password, account_type: accountType })
      tokens.save(pair)
      setSession(await api.get<Session>('/auth/me'))
    },
    [],
  )

  const signOut = useCallback(() => {
    tokens.clear()
    setSession(null)
  }, [])

  const isCorpAdmin = session?.user.role === 'CORP_ADMIN' || session?.user.account_type === 'corp_admin'
  const isHR = session?.user.role === 'HR' || session?.user.account_type === 'hr'
  const isEmployee = session?.user.role === 'EMPLOYEE' || session?.user.account_type === 'employee'
  const isAdmin = isCorpAdmin || isHR

  const value = useMemo<AuthValue>(
    () => ({
      session,
      loading,
      isAdmin,
      isCorpAdmin,
      isHR,
      isEmployee,
      signIn,
      signOut,
      refreshSession: loadSession,
    }),
    [session, loading, isAdmin, isCorpAdmin, isHR, isEmployee, signIn, signOut, loadSession],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
