import { useCallback, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Briefcase, Mail, Save, ShieldCheck, UserRound } from 'lucide-react'
import { ApiError, api } from '@/api/client'
import type { EmployeeDetail } from '@/api/types'
import { useAsync } from '@/hooks/useAsync'
import { PageHeader } from '@/components/PageHeader'
import {
  Button,
  Card,
  CardHeader,
  ErrorState,
  Field,
  FormBanner,
  Input,
  Pill,
  Skeleton,
} from '@/components/ui/Primitives'
import { profileSchema, type ProfileValues } from '@/lib/validation'
import { fmtDate, fmtMoney, initials, titleCase } from '@/lib/format'

export default function Profile() {
  const [banner, setBanner] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  const load = useCallback(() => api.get<EmployeeDetail>('/employees/me'), [])
  const { data, loading, error, reload, setData } = useAsync(load, [])

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    mode: 'onBlur',
    values: data
      ? { phone: data.phone ?? '', address: data.address ?? '', avatar_url: data.avatar_url ?? '' }
      : undefined,
  })

  const onSubmit = async (values: ProfileValues) => {
    setBanner(null)
    setOk(null)
    try {
      const payload = {
        phone: values.phone || null,
        address: values.address || null,
        avatar_url: values.avatar_url || null,
      }
      const updated = await api.patch<EmployeeDetail>('/employees/me', payload)
      setData(updated)
      reset({ phone: updated.phone ?? '', address: updated.address ?? '', avatar_url: updated.avatar_url ?? '' })
      setOk('Your profile has been updated.')
    } catch (err) {
      if (err instanceof ApiError) {
        Object.entries(err.fields).forEach(([field, message]) =>
          setError(field as keyof ProfileValues, { message }),
        )
        setBanner(Object.keys(err.fields).length ? null : err.message)
      } else {
        setBanner('Something went wrong. Try again.')
      }
    }
  }

  if (loading && !data) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-12 w-56" />
        <Skeleton className="h-40" />
        <Skeleton className="h-72" />
      </div>
    )
  }
  if (error || !data) return <ErrorState message={error ?? 'No data came back.'} onRetry={reload} />

  return (
    <>
      <PageHeader title="Your profile" description="Contact details HR and your team can see." />

      <div className="grid gap-5 lg:grid-cols-[20rem_1fr] lg:items-start">
        <Card className="flex flex-col items-center gap-3 p-6 text-center">
          {data.avatar_url ? (
            <img
              src={data.avatar_url}
              alt={data.full_name}
              className="h-20 w-20 rounded-full object-cover ring-4 ring-flow-50"
            />
          ) : (
            <span className="grid h-20 w-20 place-items-center rounded-full bg-flow-50 text-2xl font-bold text-flow-600 ring-4 ring-flow-50">
              {initials(data.full_name)}
            </span>
          )}
          <div>
            <p className="font-bold text-ink">{data.full_name}</p>
            <p className="text-sm text-away">{data.employee_code}</p>
          </div>
          <Pill tone={data.role === 'ADMIN' ? 'bg-flow-50 text-flow-600' : 'bg-slate-150 text-ink-600'}>
            {titleCase(data.role)}
          </Pill>

          <div className="mt-3 flex w-full flex-col gap-2.5 border-t border-slate-150 pt-4 text-left text-sm">
            <p className="flex items-center gap-2 text-ink-600">
              <Mail className="h-4 w-4 shrink-0 text-away" /> {data.email}
            </p>
            <p className="flex items-center gap-2 text-ink-600">
              <Briefcase className="h-4 w-4 shrink-0 text-away" /> {data.designation} · {titleCase(data.department)}
            </p>
            <p className="flex items-center gap-2 text-ink-600">
              <UserRound className="h-4 w-4 shrink-0 text-away" /> {data.manager_name ?? 'No manager set'}
            </p>
            <p className="flex items-center gap-2 text-ink-600">
              <ShieldCheck className="h-4 w-4 shrink-0 text-away" />
              {data.is_verified ? 'Email verified' : 'Email not verified'}
            </p>
            <p className="text-sm text-away">Joined {fmtDate(data.date_of_joining, 'd MMMM yyyy')}</p>
          </div>
        </Card>

        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader title="Editable details" subtitle="Phone, address and picture — everything else is set by HR." />
            <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 p-5">
              <FormBanner message={banner} />
              {ok && (
                <p role="status" className="rounded-xl bg-present-soft px-3.5 py-3 text-sm font-semibold text-present">
                  {ok}
                </p>
              )}

              <Field label="Phone" htmlFor="phone" error={errors.phone?.message} hint="7–20 digits, optionally starting with +.">
                <Input id="phone" type="tel" placeholder="+1 555 123 4567" invalid={!!errors.phone} {...register('phone')} />
              </Field>

              <Field label="Address" htmlFor="address" error={errors.address?.message}>
                <Input id="address" placeholder="Street, city, country" invalid={!!errors.address} {...register('address')} />
              </Field>

              <Field label="Avatar URL" htmlFor="avatar_url" error={errors.avatar_url?.message} hint="A link to your picture.">
                <Input id="avatar_url" placeholder="https://…" invalid={!!errors.avatar_url} {...register('avatar_url')} />
              </Field>

              <Button type="submit" loading={isSubmitting} disabled={!isDirty} icon={<Save className="h-4 w-4" />}>
                Save changes
              </Button>
            </form>
          </Card>

          {data.salary && (
            <Card>
              <CardHeader title="Salary structure" subtitle={`Effective ${fmtDate(data.salary.effective_from, 'd MMM yyyy')}`} />
              <dl className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-4">
                <div>
                  <dt className="text-eyebrow uppercase text-away">Basic</dt>
                  <dd className="mt-1 font-bold text-ink tabular">{fmtMoney(data.salary.basic, data.salary.currency)}</dd>
                </div>
                <div>
                  <dt className="text-eyebrow uppercase text-away">HRA</dt>
                  <dd className="mt-1 font-bold text-ink tabular">{fmtMoney(data.salary.hra, data.salary.currency)}</dd>
                </div>
                <div>
                  <dt className="text-eyebrow uppercase text-away">Gross / mo</dt>
                  <dd className="mt-1 font-bold text-ink tabular">{fmtMoney(data.salary.gross_monthly, data.salary.currency)}</dd>
                </div>
                <div>
                  <dt className="text-eyebrow uppercase text-away">Net / mo</dt>
                  <dd className="mt-1 font-bold text-present tabular">{fmtMoney(data.salary.net_monthly, data.salary.currency)}</dd>
                </div>
              </dl>
            </Card>
          )}
        </div>
      </div>
    </>
  )
}
