import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight, Building2, ShieldCheck, User } from 'lucide-react'
import { ApiError } from '@/api/client'
import type { AccountType } from '@/api/types'
import { useAuth } from '@/context/AuthContext'
import { signInSchema, type SignInValues } from '@/lib/validation'
import { AuthLayout } from '@/pages/AuthLayout'
import { Button, Field, FormBanner, Input } from '@/components/ui/Primitives'

export default function SignIn() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [banner, setBanner] = useState<string | null>(null)
  const [roleType, setRoleType] = useState<AccountType>('employee')

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignInValues>({ resolver: zodResolver(signInSchema), mode: 'onBlur' })

  const onSubmit = async (values: SignInValues) => {
    setBanner(null)
    try {
      await signIn(values.email, values.password, roleType)
      const from = (location.state as { from?: string } | null)?.from
      navigate(from && from !== '/signin' ? from : '/dashboard', { replace: true })
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.fields.email) setError('email', { message: error.fields.email })
        if (error.fields.password) setError('password', { message: error.fields.password })
        setBanner(Object.keys(error.fields).length ? null : error.message)
      } else {
        setBanner('Something went wrong. Try again.')
      }
    }
  }

  return (
    <AuthLayout
      title="Sign in"
      subtitle="Select your account role to access your Dayflow workspace."
      footer={
        <p className="text-sm text-away">
          No account yet?{' '}
          <Link to="/signup" className="font-semibold text-flow-600 hover:underline">
            Create employee account
          </Link>
        </p>
      }
    >
      <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <FormBanner message={banner} />

        <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-slate-100 p-1.5 text-xs font-semibold text-ink-600">
          <button
            type="button"
            onClick={() => setRoleType('employee')}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 transition ${
              roleType === 'employee' ? 'bg-white shadow-sm text-flow-600' : 'hover:text-ink'
            }`}
          >
            <User className="h-3.5 w-3.5" />
            Employee
          </button>
          <button
            type="button"
            onClick={() => setRoleType('hr')}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 transition ${
              roleType === 'hr' ? 'bg-white shadow-sm text-flow-600' : 'hover:text-ink'
            }`}
          >
            <Building2 className="h-3.5 w-3.5" />
            HR Officer
          </button>
          <button
            type="button"
            onClick={() => setRoleType('corp_admin')}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 transition ${
              roleType === 'corp_admin' ? 'bg-white shadow-sm text-flow-600' : 'hover:text-ink'
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            Corp Admin
          </button>
        </div>

        <Field label="Work email" htmlFor="email" error={errors.email?.message} required>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder={
              roleType === 'corp_admin'
                ? 'admin@dayflow.co'
                : roleType === 'hr'
                  ? 'hr1@dayflow.co'
                  : 'employee@dayflow.co'
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
            placeholder="Your password"
            invalid={!!errors.password}
            {...register('password')}
          />
        </Field>
        <Button type="submit" loading={isSubmitting} className="mt-1 w-full" icon={<ArrowRight className="h-4 w-4" />}>
          Sign in as {roleType === 'corp_admin' ? 'Corp Admin' : roleType === 'hr' ? 'HR Officer' : 'Employee'}
        </Button>
      </form>
    </AuthLayout>
  )
}
