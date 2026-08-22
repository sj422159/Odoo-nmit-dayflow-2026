import { useCallback, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useParams } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { Save, ShieldCheck, Wallet } from 'lucide-react'
import { ApiError, api } from '@/api/client'
import type { EmployeeDetail as EmployeeDetailType, SalaryStructure } from '@/api/types'
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
  Select,
  Skeleton,
} from '@/components/ui/Primitives'
import { adminEmployeeSchema, salarySchema, type AdminEmployeeValues, type SalaryValues } from '@/lib/validation'
import { fmtDate, fmtMoney, initials, isoDate, titleCase } from '@/lib/format'

export default function EmployeeDetail() {
  const { id } = useParams<{ id: string }>()
  const employeeId = Number(id)
  const [banner, setBanner] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [salaryBanner, setSalaryBanner] = useState<string | null>(null)
  const [salaryOk, setSalaryOk] = useState<string | null>(null)

  const load = useCallback(() => api.get<EmployeeDetailType>(`/employees/${employeeId}`), [employeeId])
  const { data, loading, error, reload, setData } = useAsync(load, [employeeId])

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<AdminEmployeeValues>({
    resolver: zodResolver(adminEmployeeSchema),
    mode: 'onBlur',
    values: data
      ? {
          first_name: data.first_name,
          last_name: data.last_name,
          department: data.department,
          designation: data.designation,
          employment_type: data.employment_type,
          date_of_joining: data.date_of_joining,
          role: data.role,
          is_active: data.is_active,
          phone: data.phone ?? '',
          address: data.address ?? '',
        }
      : undefined,
  })

  const {
    register: registerSalary,
    handleSubmit: handleSalarySubmit,
    setError: setSalaryError,
    formState: { errors: salaryErrors, isSubmitting: salarySubmitting },
  } = useForm<SalaryValues>({
    resolver: zodResolver(salarySchema),
    mode: 'onBlur',
    values: data?.salary
      ? {
          currency: data.salary.currency,
          basic: data.salary.basic,
          hra: data.salary.hra,
          allowances: data.salary.allowances,
          deductions: data.salary.deductions,
          effective_from: isoDate(new Date()),
        }
      : { currency: 'USD', basic: '', hra: '0', allowances: '0', deductions: '0', effective_from: isoDate(new Date()) },
  })

  const onSubmit = async (values: AdminEmployeeValues) => {
    setBanner(null)
    setOk(null)
    try {
      const payload = { ...values, phone: values.phone || null, address: values.address || null }
      const updated = await api.patch<EmployeeDetailType>(`/employees/${employeeId}`, payload)
      setData(updated)
      setOk('Employee record updated.')
    } catch (err) {
      if (err instanceof ApiError) {
        setBanner(err.message)
      } else {
        setBanner('Something went wrong. Try again.')
      }
    }
  }

  const onSalarySubmit = async (values: SalaryValues) => {
    setSalaryBanner(null)
    setSalaryOk(null)
    try {
      const salary = await api.put<SalaryStructure>(`/payroll/${employeeId}/salary-structure`, values)
      if (data) setData({ ...data, salary })
      setSalaryOk('Salary structure saved. It will apply on the next payroll run.')
    } catch (err) {
      if (err instanceof ApiError) {
        Object.entries(err.fields).forEach(([field, message]) =>
          setSalaryError(field as keyof SalaryValues, { message }),
        )
        setSalaryBanner(Object.keys(err.fields).length ? null : err.message)
      } else {
        setSalaryBanner('Something went wrong. Try again.')
      }
    }
  }

  if (loading && !data) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-12 w-56" />
        <Skeleton className="h-96" />
      </div>
    )
  }
  if (error || !data) return <ErrorState message={error ?? 'No data came back.'} onRetry={reload} />

  return (
    <>
      <PageHeader
        title={data.full_name}
        description={`${data.employee_code} · ${data.designation} · ${titleCase(data.department)}`}
        crumbs={[{ label: 'People', to: '/admin/employees' }]}
      />

      <div className="grid gap-5 lg:grid-cols-[16rem_1fr] lg:items-start">
        <Card className="flex flex-col items-center gap-3 p-6 text-center">
          {data.avatar_url ? (
            <img src={data.avatar_url} alt={data.full_name} className="h-16 w-16 rounded-full object-cover" />
          ) : (
            <span className="grid h-16 w-16 place-items-center rounded-full bg-flow-50 text-xl font-bold text-flow-600">
              {initials(data.full_name)}
            </span>
          )}
          <p className="font-bold text-ink">{data.full_name}</p>
          <p className="text-sm text-away">{data.email}</p>
          <div className="flex gap-2">
            <Pill tone={data.role === 'ADMIN' ? 'bg-flow-50 text-flow-600' : 'bg-slate-150 text-ink-600'}>
              {titleCase(data.role)}
            </Pill>
            <Pill tone={data.is_active ? 'bg-present-soft text-present' : 'bg-absent-soft text-absent'}>
              {data.is_active ? 'Active' : 'Inactive'}
            </Pill>
          </div>
          <p className="flex items-center gap-1.5 text-sm text-away">
            <ShieldCheck className="h-3.5 w-3.5" /> {data.is_verified ? 'Verified' : 'Unverified'}
          </p>
          <p className="text-sm text-away">Joined {fmtDate(data.date_of_joining, 'd MMM yyyy')}</p>
        </Card>

        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader title="Employment record" subtitle="Full edit access — changes take effect immediately." />
            <form noValidate onSubmit={handleSubmit(onSubmit)} className="grid gap-4 p-5 sm:grid-cols-2">
              <FormBanner message={banner} />
              {ok && (
                <p role="status" className="sm:col-span-2 rounded-xl bg-present-soft px-3.5 py-3 text-sm font-semibold text-present">
                  {ok}
                </p>
              )}

              <Field label="First name" htmlFor="first_name" error={errors.first_name?.message} required>
                <Input id="first_name" invalid={!!errors.first_name} {...register('first_name')} />
              </Field>
              <Field label="Last name" htmlFor="last_name" error={errors.last_name?.message} required>
                <Input id="last_name" invalid={!!errors.last_name} {...register('last_name')} />
              </Field>
              <Field label="Department" htmlFor="department" error={errors.department?.message} required>
                <Input id="department" invalid={!!errors.department} {...register('department')} />
              </Field>
              <Field label="Designation" htmlFor="designation" error={errors.designation?.message} required>
                <Input id="designation" invalid={!!errors.designation} {...register('designation')} />
              </Field>
              <Field label="Employment type" htmlFor="employment_type" error={errors.employment_type?.message} required>
                <Select id="employment_type" invalid={!!errors.employment_type} {...register('employment_type')}>
                  <option value="FULL_TIME">Full time</option>
                  <option value="PART_TIME">Part time</option>
                  <option value="CONTRACT">Contract</option>
                  <option value="INTERN">Intern</option>
                </Select>
              </Field>
              <Field label="Date of joining" htmlFor="date_of_joining" error={errors.date_of_joining?.message} required>
                <Input id="date_of_joining" type="date" invalid={!!errors.date_of_joining} {...register('date_of_joining')} />
              </Field>
              <Field label="Role" htmlFor="role" error={errors.role?.message} required>
                <Select id="role" invalid={!!errors.role} {...register('role')}>
                  <option value="EMPLOYEE">Employee</option>
                  <option value="ADMIN">Admin</option>
                </Select>
              </Field>
              <Field label="Status" htmlFor="is_active" error={errors.is_active?.message} required>
                <Select id="is_active" {...register('is_active', { setValueAs: (v) => v === 'true' })}>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </Select>
              </Field>
              <Field label="Phone" htmlFor="phone" error={errors.phone?.message}>
                <Input id="phone" invalid={!!errors.phone} {...register('phone')} />
              </Field>
              <Field label="Address" htmlFor="address" error={errors.address?.message}>
                <Input id="address" invalid={!!errors.address} {...register('address')} />
              </Field>

              <div className="sm:col-span-2">
                <Button type="submit" loading={isSubmitting} disabled={!isDirty} icon={<Save className="h-4 w-4" />}>
                  Save changes
                </Button>
              </div>
            </form>
          </Card>

          <Card>
            <CardHeader
              title="Salary structure"
              subtitle={
                data.salary
                  ? `Current: ${fmtMoney(data.salary.net_monthly, data.salary.currency)} net / month`
                  : 'No structure set yet'
              }
            />
            <form noValidate onSubmit={handleSalarySubmit(onSalarySubmit)} className="grid gap-4 p-5 sm:grid-cols-3">
              <FormBanner message={salaryBanner} />
              {salaryOk && (
                <p role="status" className="sm:col-span-3 rounded-xl bg-present-soft px-3.5 py-3 text-sm font-semibold text-present">
                  {salaryOk}
                </p>
              )}

              <Field label="Currency" htmlFor="currency" error={salaryErrors.currency?.message} required>
                <Input id="currency" maxLength={3} invalid={!!salaryErrors.currency} {...registerSalary('currency')} />
              </Field>
              <Field label="Basic" htmlFor="basic" error={salaryErrors.basic?.message} required>
                <Input id="basic" invalid={!!salaryErrors.basic} {...registerSalary('basic')} />
              </Field>
              <Field label="HRA" htmlFor="hra" error={salaryErrors.hra?.message} required>
                <Input id="hra" invalid={!!salaryErrors.hra} {...registerSalary('hra')} />
              </Field>
              <Field label="Allowances" htmlFor="allowances" error={salaryErrors.allowances?.message} required>
                <Input id="allowances" invalid={!!salaryErrors.allowances} {...registerSalary('allowances')} />
              </Field>
              <Field label="Deductions" htmlFor="deductions" error={salaryErrors.deductions?.message} required>
                <Input id="deductions" invalid={!!salaryErrors.deductions} {...registerSalary('deductions')} />
              </Field>
              <Field label="Effective from" htmlFor="effective_from" error={salaryErrors.effective_from?.message} required>
                <Input id="effective_from" type="date" invalid={!!salaryErrors.effective_from} {...registerSalary('effective_from')} />
              </Field>

              <div className="sm:col-span-3">
                <Button type="submit" loading={salarySubmitting} icon={<Wallet className="h-4 w-4" />}>
                  Save structure
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </>
  )
}
