import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight } from 'lucide-react'
import { ApiError } from '@/api/client'
import { useAuth } from '@/context/AuthContext'
import { signInSchema, type SignInValues } from '@/lib/validation'
import { AuthLayout } from '@/pages/AuthLayout'
import { Button, Field, FormBanner, Input } from '@/components/ui/Primitives'

export default function SignIn() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [banner, setBanner] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignInValues>({ resolver: zodResolver(signInSchema), mode: 'onBlur' })

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
        setBanner('Something went wrong. Try again.')
      }
    }
  }

  return (
    <AuthLayout
      title="Sign in"
      subtitle="Pick up your day where you left it."
      footer={
        <p className="text-sm text-away">
          No account yet?{' '}
          <Link to="/signup" className="font-semibold text-flow-600 hover:underline">
            Create one
          </Link>
        </p>
      }
    >
      <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <FormBanner message={banner} />
        <Field label="Work email" htmlFor="email" error={errors.email?.message} required>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
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
          Sign in
        </Button>
      </form>
    </AuthLayout>
  )
}
