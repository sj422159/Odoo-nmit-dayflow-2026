import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle2, XCircle } from 'lucide-react'
import { ApiError, api } from '@/api/client'
import { AuthLayout } from '@/pages/AuthLayout'
import { Button, Field, Input } from '@/components/ui/Primitives'

export default function VerifyEmail() {
  const [params] = useSearchParams()
  const token = params.get('token')
  const [state, setState] = useState<'working' | 'ok' | 'failed'>(token ? 'working' : 'failed')
  const [message, setMessage] = useState(token ? 'Confirming your address…' : 'This link is missing its token.')
  const [email, setEmail] = useState('')
  const [resent, setResent] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const ran = useRef(false)

  useEffect(() => {
    if (!token || ran.current) return
    ran.current = true
    api
      .public.post<{ message: string }>('/auth/verify', { token })
      .then((res) => {
        setState('ok')
        setMessage(res.message)
      })
      .catch((error) => {
        setState('failed')
        setMessage(error instanceof ApiError ? error.message : 'That link could not be confirmed.')
      })
  }, [token])

  const resend = async () => {
    setSending(true)
    try {
      const res = await api.public.post<{ message: string; verification_link: string | null }>(
        '/auth/resend-verification',
        { email },
      )
      setResent(res.verification_link ?? res.message)
    } catch {
      setResent('Could not send right now. Try again in a moment.')
    } finally {
      setSending(false)
    }
  }

  return (
    <AuthLayout title="Email confirmation" subtitle={message}>
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-3">
          {state === 'ok' ? (
            <CheckCircle2 className="h-8 w-8 text-present" aria-hidden />
          ) : state === 'failed' ? (
            <XCircle className="h-8 w-8 text-absent" aria-hidden />
          ) : (
            <span className="h-8 w-8 animate-pulse rounded-full bg-slate-150" aria-hidden />
          )}
          <p className="text-sm text-ink-600">
            {state === 'ok'
              ? 'Your account is active.'
              : state === 'failed'
                ? 'Send yourself a fresh link below.'
                : 'One moment.'}
          </p>
        </div>

        {state === 'ok' && (
          <Link to="/signin">
            <Button className="w-full">Go to sign in</Button>
          </Link>
        )}

        {state === 'failed' && (
          <div className="flex flex-col gap-3 border-t border-slate-150 pt-4">
            <Field label="Your email" htmlFor="resend-email">
              <Input
                id="resend-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@company.com"
              />
            </Field>
            <Button variant="secondary" onClick={resend} loading={sending} disabled={!email.includes('@')}>
              Send a new link
            </Button>
            {resent && <p className="break-all text-sm text-ink-600">{resent}</p>}
          </div>
        )}
      </div>
    </AuthLayout>
  )
}
