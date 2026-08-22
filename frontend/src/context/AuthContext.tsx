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
import type { Session, TokenPair } from '@/api/types'

interface AuthValue {
  session: Session | null
  loading: boolean
  isAdmin: boolean
  isCorporate: boolean
  signIn: (email: string, password: string) => Promise<Session>
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
    async (email: string, password: string) => {
      const pair = await api.public.post<TokenPair>('/auth/login', { email, password })
      tokens.save(pair)
      const nextSession = await api.get<Session>('/auth/me')
      setSession(nextSession)
      return nextSession
    },
    [],
  )

  const signOut = useCallback(() => {
    tokens.clear()
    setSession(null)
  }, [])

  const value = useMemo<AuthValue>(
    () => ({
      session,
      loading,
      isAdmin: session?.user.role === 'HR_ADMIN' || session?.user.role === 'ADMIN',
      isCorporate: session?.user.role === 'CORPORATE',
      signIn,
      signOut,
      refreshSession: loadSession,
    }),
    [session, loading, signIn, signOut, loadSession],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
