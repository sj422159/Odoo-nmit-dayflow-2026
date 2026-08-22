import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Icon } from '@iconify/react'
import { ApiError, api } from '@/api/client'
import { PASSWORD_RULES, signUpSchema, type SignUpValues } from '@/lib/validation'
import { AuthLayout } from '@/pages/AuthLayout'
import { Button, Field, FormBanner, Input, Select } from '@/components/ui/Primitives'

const REGISTERED_ORGANIZATIONS = [
  'TeCryst Technologies',
  'Acme Global Enterprises',
  'Innovate HR Labs',
  'Vertex Digital Solutions',
  'Nexus Media & Logistics',
]

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
    defaultValues: { role: 'EMPLOYEE', organization: 'TeCryst Technologies', department: '', designation: '' },
  })

  const password = watch('password') ?? ''
  const selectedRole = watch('role') ?? 'EMPLOYEE'

  const onSubmit = async (values: SignUpValues) => {
    setBanner(null)
    try {
      // Generate a valid employee code format for the backend (TC-XXXX)
      const generatedCode = `TC-${Math.floor(1000 + Math.random() * 9000)}`
      const res = await api.public.post<{ message: string; verification_link: string | null }>(
        '/auth/signup',
        {
          ...values,
          employee_code: generatedCode,
          department: values.department || 'Unassigned',
          designation: values.designation || (values.role === 'ADMIN' ? 'HR Administrator' : 'Associate'),
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
        setBanner('Something went wrong. Please check your details and try again.')
      }
    }
  }

  if (done) {
    return (
      <AuthLayout title="Check your inbox" subtitle={done.message}>
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink-600">
            Confirm the address to activate the account, then sign in.
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
      subtitle="Takes a minute to register your role on the platform."
      footer={
        <p className="text-sm text-away">
          Already registered?{' '}
          <Link to="/signin" className="font-semibold text-flow-600 hover:underline">
            Sign in
          </Link>
        </p>
      }
    >
      <form noValidate autoComplete="off" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <FormBanner message={banner} />

        {/* Account Role Selection */}
        <Field label="Account role" htmlFor="role" error={errors.role?.message} required>
          <Select id="role" invalid={!!errors.role} {...register('role')} className="cursor-pointer">
            <option value="EMPLOYEE">Employee</option>
            <option value="ADMIN">HR / Admin</option>
          </Select>
        </Field>

        {/* Organization Logic: Dropdown for Employee vs Text Input for HR/Admin */}
        {selectedRole === 'EMPLOYEE' ? (
          <Field
            label="Organization"
            htmlFor="organization"
            error={errors.organization?.message}
            required
          >
            <Select
              id="organization"
              invalid={!!errors.organization}
              {...register('organization')}
              className="cursor-pointer"
            >
              <option value="">Choose your organization...</option>
              {REGISTERED_ORGANIZATIONS.map((org) => (
                <option key={org} value={org}>
                  {org}
                </option>
              ))}
            </Select>
          </Field>
        ) : (
          <Field
            label="Organization name"
            htmlFor="organization"
            error={errors.organization?.message}
            required
          >
            <Input
              id="organization"
              type="text"
              autoComplete="off"
              invalid={!!errors.organization}
              {...register('organization')}
            />
          </Field>
        )}

        {/* Name Fields */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name" htmlFor="first_name" error={errors.first_name?.message} required>
            <Input
              id="first_name"
              autoComplete="off"
              invalid={!!errors.first_name}
              {...register('first_name')}
            />
          </Field>
          <Field label="Last name" htmlFor="last_name" error={errors.last_name?.message} required>
            <Input
              id="last_name"
              autoComplete="off"
              invalid={!!errors.last_name}
              {...register('last_name')}
            />
          </Field>
        </div>

        {/* Work Email Field */}
        <Field label="Work email" htmlFor="email" error={errors.email?.message} required>
          <Input
            id="email"
            type="email"
            autoComplete="off"
            invalid={!!errors.email}
            {...register('email')}
          />
        </Field>

        {/* Optional Department and Job Title (Employee only) */}
        {selectedRole === 'EMPLOYEE' && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Department" htmlFor="department" error={errors.department?.message}>
              <Input id="department" autoComplete="off" {...register('department')} />
            </Field>
            <Field label="Job title" htmlFor="designation" error={errors.designation?.message}>
              <Input id="designation" autoComplete="off" {...register('designation')} />
            </Field>
          </div>
        )}

        {/* Password Field */}
        <Field label="Password" htmlFor="password" error={errors.password?.message} required>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            invalid={!!errors.password}
            {...register('password')}
          />
        </Field>

        {/* Password Strength Checklist with Iconify */}
        <ul className="-mt-1 grid gap-1 sm:grid-cols-2">
          {PASSWORD_RULES.map((rule) => {
            const met = rule.test(password)
            return (
              <li
                key={rule.label}
                className={`flex items-center gap-1.5 text-xs ${met ? 'text-present' : 'text-away'}`}
              >
                <Icon
                  icon={met ? 'mdi:check-circle' : 'mdi:close-circle'}
                  className={`h-3.5 w-3.5 shrink-0 ${met ? 'text-present' : 'text-away/60'}`}
                />
                {rule.label}
              </li>
            )
          })}
        </ul>

        {/* Confirm Password Field */}
        <Field label="Repeat password" htmlFor="confirm_password" error={errors.confirm_password?.message} required>
          <Input
            id="confirm_password"
            type="password"
            autoComplete="new-password"
            invalid={!!errors.confirm_password}
            {...register('confirm_password')}
          />
        </Field>

        <Button
          type="submit"
          loading={isSubmitting}
          className="mt-1 w-full flex items-center justify-center gap-2"
        >
          <span>Create account</span>
          <Icon icon="mdi:account-plus-outline" className="h-4 w-4" />
        </Button>
      </form>
    </AuthLayout>
  )
}
