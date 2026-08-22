import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Check, UserPlus, X } from 'lucide-react'
import { ApiError, api } from '@/api/client'
import { PASSWORD_RULES, signUpSchema, type SignUpValues } from '@/lib/validation'
import { AuthLayout } from '@/pages/AuthLayout'
import { Button, Field, FormBanner, Input } from '@/components/ui/Primitives'

export default function SignUp() {
  const [banner, setBanner] = useState<string | null>(null)
  const [done, setDone] = useState<{ message: string; link: string | null } | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    mode: 'onBlur',
    defaultValues: {},
  })

  const password = watch('password') ?? ''

  const onSubmit = async (values: SignUpValues) => {
    setBanner(null)
    try {
      const res = await api.public.post<{ message: string; verification_link: string | null }>(
        '/auth/signup',
        {
          ...values,
        },
      )
      setDone({ message: res.message, link: res.verification_link })
    } catch (error) {
      if (error instanceof ApiError) {
        Object.entries(error.fields).forEach(([field, message]) => {
          setError(field as keyof SignUpValues, { message })
        })
        setBanner(Object.keys(error.fields).length ? null : error.message)
      } else {
        setBanner('Something went wrong. Try again.')
      }
    }
  }

  if (done) {
    return (
      <AuthLayout title="Check your inbox" subtitle={done.message}>
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink-600">
            Confirm your address, then wait for HR to approve your login request.
          </p>
          {done.link && (
            <div className="rounded-xl border border-flow-200 bg-flow-50 p-3.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-flow-700">
                Development mode
              </p>
              <p className="mt-1 text-sm text-ink-600">
                Mail is written to <code className="tabular text-xs">backend/var/mail</code>. Open the link directly:
              </p>
              <a href={done.link} className="mt-2 block break-all text-sm font-semibold text-flow-600 hover:underline">
                {done.link}
              </a>
            </div>
          )}
          <Link to="/signin">
            <Button variant="secondary" className="w-full">
              Back to sign in
            </Button>
          </Link>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Takes a minute. Your HR officer can fill in the rest."
      footer={
        <p className="text-sm text-away">
          Already registered?{' '}
          <Link to="/signin" className="font-semibold text-flow-600 hover:underline">
            Sign in
          </Link>
        </p>
      }
    >
      <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <FormBanner message={banner} />

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name" htmlFor="first_name" error={errors.first_name?.message} required>
            <Input id="first_name" autoComplete="given-name" invalid={!!errors.first_name} {...register('first_name')} />
          </Field>
          <Field label="Last name" htmlFor="last_name" error={errors.last_name?.message} required>
            <Input id="last_name" autoComplete="family-name" invalid={!!errors.last_name} {...register('last_name')} />
          </Field>
        </div>

        <Field label="Work email" htmlFor="email" error={errors.email?.message} required>
          <Input id="email" type="email" autoComplete="email" placeholder="you@company.com" invalid={!!errors.email} {...register('email')} />
        </Field>

        <Field label="Password" htmlFor="password" error={errors.password?.message} required>
          <Input id="password" type="password" autoComplete="new-password" invalid={!!errors.password} {...register('password')} />
        </Field>

        <ul className="-mt-1 grid gap-1 sm:grid-cols-2">
          {PASSWORD_RULES.map((rule) => {
            const met = rule.test(password)
            return (
              <li
                key={rule.label}
                className={`flex items-center gap-1.5 text-xs ${met ? 'text-present' : 'text-away'}`}
              >
                {met ? <Check className="h-3.5 w-3.5" aria-hidden /> : <X className="h-3.5 w-3.5" aria-hidden />}
                {rule.label}
              </li>
            )
          })}
        </ul>

        <Field label="Repeat password" htmlFor="confirm_password" error={errors.confirm_password?.message} required>
          <Input
            id="confirm_password"
            type="password"
            autoComplete="new-password"
            invalid={!!errors.confirm_password}
            {...register('confirm_password')}
          />
        </Field>

        <Button type="submit" loading={isSubmitting} className="mt-1 w-full" icon={<UserPlus className="h-4 w-4" />}>
          Create account
        </Button>
      </form>
    </AuthLayout>
  )
}
