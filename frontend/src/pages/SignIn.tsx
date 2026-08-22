import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight, Building2, Shield, User, Users, KeyRound } from 'lucide-react'
import { ApiError } from '@/api/client'
import { useAuth } from '@/context/AuthContext'
import { signInSchema, type SignInValues } from '@/lib/validation'
import { AuthLayout } from '@/pages/AuthLayout'
import { Button, Field, FormBanner, Input } from '@/components/ui/Primitives'

type AccessType = 'INTERNAL' | 'EXTERNAL'
type InternalRole = 'EMPLOYEE' | 'HR_ADMIN'

export default function SignIn() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [accessType, setAccessType] = useState<AccessType>('INTERNAL')
  const [internalRole, setInternalRole] = useState<InternalRole>('EMPLOYEE')
  const [banner, setBanner] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    mode: 'onBlur',
  })

  const onSubmit = async (values: SignInValues) => {
    setBanner(null)
    try {
      await signIn(values.email, values.password)
      const from = (location.state as { from?: string } | null)?.from
      navigate(from && from !== '/signin' ? from : '/dashboard', { replace: true })
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.fields.email) setError('email', { message: error.fields.email })
        if (error.fields.password) setError('password', { message: error.fields.password })
        setBanner(Object.keys(error.fields).length ? null : error.message)
      } else {
        setBanner('Invalid credentials. Please check your email and password.')
      }
    }
  }

  // Quick Demo Account Pre-filler helper
  const fillDemoAccount = (role: 'emp' | 'hr' | 'corp') => {
    setBanner(null)
    if (role === 'emp') {
      setAccessType('INTERNAL')
      setInternalRole('EMPLOYEE')
      setValue('email', 'employee@tecryst.com')
      setValue('password', 'Password@123')
    } else if (role === 'hr') {
      setAccessType('INTERNAL')
      setInternalRole('HR_ADMIN')
      setValue('email', 'hr.admin@tecryst.com')
      setValue('password', 'Password@123')
    } else {
      setAccessType('EXTERNAL')
      setValue('email', 'corp.admin@tecryst.com')
      setValue('password', 'Password@123')
    }
  }

  const getSubtitle = () => {
    if (accessType === 'EXTERNAL') {
      return 'Enterprise authentication for Corporate Admins & Organization Executives.'
    }
    return internalRole === 'EMPLOYEE'
      ? 'Access your daily attendance, leave balance, and payslips.'
      : 'Access the workforce management board, approvals, and payroll engine.'
  }

  return (
    <AuthLayout
      title={accessType === 'EXTERNAL' ? 'Corporate Sign In' : 'Internal Sign In'}
      subtitle={getSubtitle()}
      footer={
        <div className="space-y-4">
          <p className="text-sm text-away">
            {accessType === 'INTERNAL' ? (
              <>
                Need internal company access?{' '}
                <Link to="/signup" className="font-semibold text-flow-600 hover:underline">
                  Register Employee ID
                </Link>
              </>
            ) : (
              <>
                External account issue?{' '}
                <a href="mailto:support@tecryst.com" className="font-semibold text-flow-600 hover:underline">
                  Contact Enterprise Support
                </a>
              </>
            )}
          </p>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        {/* ======================================================== */}
        {/* 1. PRIMARY ACCESS SWITCH: Internal vs External           */}
        {/* ======================================================== */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-600">
            Access Network
          </label>
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 border border-slate-200/80">
            <button
              type="button"
              onClick={() => {
                setAccessType('INTERNAL')
                setBanner(null)
              }}
              className={`flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition-all ${
                accessType === 'INTERNAL'
                  ? 'bg-white text-ink shadow-sm border border-slate-200/60'
                  : 'text-ink-600 hover:text-ink hover:bg-slate-200/50'
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              Internal Access
            </button>

            <button
              type="button"
              onClick={() => {
                setAccessType('EXTERNAL')
                setBanner(null)
              }}
              className={`flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition-all ${
                accessType === 'EXTERNAL'
                  ? 'bg-white text-ink shadow-sm border border-slate-200/60'
                  : 'text-ink-600 hover:text-ink hover:bg-slate-200/50'
              }`}
            >
              <Building2 className="h-3.5 w-3.5" />
              External Access
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 2. INTERNAL ROLE SELECTOR: Employee vs HR Admin          */}
        {/* ======================================================== */}
        {accessType === 'INTERNAL' ? (
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-600">
              Select Internal Role
            </label>
            <div className="grid grid-cols-2 gap-2">
              {/* Employee Option */}
              <button
                type="button"
                onClick={() => {
                  setInternalRole('EMPLOYEE')
                  setBanner(null)
                }}
                className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                  internalRole === 'EMPLOYEE'
                    ? 'border-flow-500 bg-flow-50/60 ring-1 ring-flow-500 text-ink'
                    : 'border-slate-200 bg-white hover:border-slate-300 text-ink-600'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs">
                  <div
                    className={`p-1 rounded-lg ${
                      internalRole === 'EMPLOYEE' ? 'bg-flow-500 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <User className="h-3.5 w-3.5" />
                  </div>
                  Employee
                </div>
                <span className="mt-1 text-[11px] text-ink-400 leading-tight">
                  Self-service portal
                </span>
              </button>

              {/* HR / Admin Option */}
              <button
                type="button"
                onClick={() => {
                  setInternalRole('HR_ADMIN')
                  setBanner(null)
                }}
                className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                  internalRole === 'HR_ADMIN'
                    ? 'border-flow-500 bg-flow-50/60 ring-1 ring-flow-500 text-ink'
                    : 'border-slate-200 bg-white hover:border-slate-300 text-ink-600'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs">
                  <div
                    className={`p-1 rounded-lg ${
                      internalRole === 'HR_ADMIN' ? 'bg-flow-500 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <Shield className="h-3.5 w-3.5" />
                  </div>
                  HR / Admin
                </div>
                <span className="mt-1 text-[11px] text-ink-400 leading-tight">
                  Approvals &amp; Payroll
                </span>
              </button>
            </div>
          </div>
        ) : (
          /* External Corporate Admin Banner */
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-3.5 flex items-start gap-3">
            <div className="rounded-lg bg-indigo-600 p-2 text-white shrink-0">
              <Building2 className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-indigo-950">Corporate Administrator Portal</p>
              <p className="text-[11px] leading-relaxed text-indigo-800/80 mt-0.5">
                Single sign-on for Corporate Management, Multi-Tenant Audits, and Global Organization Settings.
              </p>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 3. SIGN IN FORM                                          */}
        {/* ======================================================== */}
        <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <FormBanner message={banner} />

          <Field
            label={accessType === 'EXTERNAL' ? 'Corporate email' : 'Work email'}
            htmlFor="email"
            error={errors.email?.message}
            hint={
              accessType === 'EXTERNAL'
                ? 'Corporate / Admin email ID'
                : internalRole === 'EMPLOYEE'
                ? 'Registered employee email address'
                : 'HR officer / Administrator email'
            }
            required
          >
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder={
                accessType === 'EXTERNAL'
                  ? 'corp.admin@tecryst.com'
                  : internalRole === 'EMPLOYEE'
                  ? 'employee@tecryst.com'
                  : 'hr.admin@tecryst.com'
              }
              invalid={!!errors.email}
              {...register('email')}
            />
          </Field>

          <Field label="Password" htmlFor="password" error={errors.password?.message} required>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="Enter your security password"
              invalid={!!errors.password}
              {...register('password')}
            />
          </Field>

          <Button
            type="submit"
            loading={isSubmitting}
            className="mt-1 w-full"
            icon={<ArrowRight className="h-4 w-4" />}
          >
            {accessType === 'EXTERNAL'
              ? 'Sign in as Corporate Admin'
              : internalRole === 'EMPLOYEE'
              ? 'Sign in as Employee'
              : 'Sign in as HR Admin'}
          </Button>
        </form>

        {/* Quick autofill helper chips */}
        <div className="border-t border-slate-150 pt-3">
          <p className="text-[11px] font-semibold text-ink-400 mb-2 flex items-center gap-1.5">
            <KeyRound className="h-3 w-3" /> Quick fill test accounts:
          </p>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => fillDemoAccount('emp')}
              className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-200 transition-colors"
            >
              Employee Demo
            </button>
            <button
              type="button"
              onClick={() => fillDemoAccount('hr')}
              className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-200 transition-colors"
            >
              HR Admin Demo
            </button>
            <button
              type="button"
              onClick={() => fillDemoAccount('corp')}
              className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-200 transition-colors"
            >
              Corporate Admin Demo
            </button>
          </div>
        </div>
      </div>
    </AuthLayout>
  )
}
