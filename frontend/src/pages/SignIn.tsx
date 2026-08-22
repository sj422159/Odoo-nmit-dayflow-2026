import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Icon } from '@iconify/react'
import { ApiError } from '@/api/client'
import { useAuth } from '@/context/AuthContext'
import { signInSchema, type SignInValues } from '@/lib/validation'
import { AuthLayout } from '@/pages/AuthLayout'
import { Button, Field, FormBanner, Input, Select } from '@/components/ui/Primitives'

type AccessType = 'INTERNAL' | 'EXTERNAL'
type InternalRole = 'EMPLOYEE' | 'HR_ADMIN'

export default function SignIn({ corporate = false }: { corporate?: boolean }) {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [accessType, setAccessType] = useState<AccessType>(corporate ? 'EXTERNAL' : 'INTERNAL')
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
      const session = await signIn(values.email, values.password)
      const from = (location.state as { from?: string } | null)?.from
      const destination =
        from && from !== '/signin' && from !== '/corporate/signin'
          ? from
          : session.user.role === 'CORPORATE'
            ? '/corporate/dashboard'
            : session.user.role === 'HR_ADMIN' || session.user.role === 'ADMIN'
              ? '/admin/employees'
              : '/dashboard'
      navigate(destination, { replace: true })
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
      setValue('email', 'employee@dayflow.co')
      setValue('password', '1234')
    } else if (role === 'hr') {
      setAccessType('INTERNAL')
      setInternalRole('HR_ADMIN')
      setValue('email', 'hr@dayflow.co')
      setValue('password', '1234')
    } else {
      setAccessType('EXTERNAL')
      setValue('email', 'admin@gmail.com')
      setValue('password', '1234')
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
              <Icon icon="mdi:account-group-outline" className="h-4 w-4" />
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
              <Icon icon="mdi:domain" className="h-4 w-4" />
              External Access
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 2. INTERNAL ROLE SELECTOR: Clean Dropdown                */}
        {/* ======================================================== */}
        {accessType === 'INTERNAL' && (
          <div>
            <label htmlFor="internal_role" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-600">
              Select Internal Role
            </label>
            <Select
              id="internal_role"
              value={internalRole}
              onChange={(e) => {
                setInternalRole(e.target.value as InternalRole)
                setBanner(null)
              }}
              className="w-full bg-white font-medium text-ink cursor-pointer"
            >
              <option value="EMPLOYEE">Employee</option>
              <option value="HR_ADMIN">HR / Admin</option>
            </Select>
          </div>
        )}

        {/* ======================================================== */}
        {/* 3. SIGN IN FORM                                          */}
        {/* ======================================================== */}
        <form noValidate autoComplete="off" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <FormBanner message={banner} />

          <Field
            label={accessType === 'EXTERNAL' ? 'Email' : 'Work email'}
            htmlFor="email"
            error={errors.email?.message}
            required
          >
            <Input
              id="email"
              type="email"
              autoComplete="off"
              invalid={!!errors.email}
              {...register('email')}
            />
          </Field>

          <Field label="Password" htmlFor="password" error={errors.password?.message} required>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              invalid={!!errors.password}
              {...register('password')}
            />
          </Field>

          <Button
            type="submit"
            loading={isSubmitting}
            className="mt-1 w-full flex items-center justify-center gap-2"
          >
            <span>
              {accessType === 'EXTERNAL'
                ? 'Sign in as Corporate Admin'
                : internalRole === 'EMPLOYEE'
                ? 'Sign in as Employee'
                : 'Sign in as HR / Admin'}
            </span>
            <Icon icon="mdi:arrow-right" className="h-4 w-4" />
          </Button>
        </form>

        {/* Quick autofill helper chips */}
        <div className="border-t border-slate-150 pt-3">
          <p className="text-[11px] font-semibold text-ink-400 mb-2 flex items-center gap-1.5">
            <Icon icon="mdi:key-outline" className="h-3.5 w-3.5" /> Quick fill test accounts:
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
              HR / Admin Demo
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
