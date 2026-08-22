import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Icon } from '@iconify/react'
import { ApiError, api } from '@/api/client'
import type { Department, EmployeeDetail, EmployeeSummary, Paginated } from '@/api/types'
import { PageHeader } from '@/components/PageHeader'
import {
  Button,
  Card,
  CardHeader,
  Field,
  FormBanner,
  Input,
  Select,
} from '@/components/ui/Primitives'
import {
  employeeCreateSchema,
  PASSWORD_RULES,
  type EmployeeCreateValues,
} from '@/lib/validation'

export default function AddEmployee() {
  const navigate = useNavigate()
  const [banner, setBanner] = useState<string | null>(null)
  const [departments, setDepartments] = useState<Department[]>([])
  const [managers, setManagers] = useState<EmployeeSummary[]>([])

  useEffect(() => {
    api.get<Department[]>('/employees/departments').then(setDepartments).catch(() => setDepartments([]))
    api
      .get<Paginated<EmployeeSummary>>('/employees', { page_size: 100 })
      .then((res) => setManagers(res.items))
      .catch(() => setManagers([]))
  }, [])

  const {
    register,
    handleSubmit,
    watch,
    reset,
    getValues,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<EmployeeCreateValues>({
    resolver: zodResolver(employeeCreateSchema),
    mode: 'onChange',
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      password: '',
      phone: '',
      address: '',
      department: 'Engineering',
      designation: 'Software Engineer',
      employment_type: 'FULL_TIME',
      date_of_joining: new Date().toISOString().split('T')[0],
      manager_id: '',
      role: 'EMPLOYEE',
      avatar_url: '',
    },
  })

  const saveDraft = () => {
    const values = getValues()
    localStorage.setItem('dayflow.draft.add_employee', JSON.stringify(values))
    setBanner('Draft saved to browser storage.')
    setTimeout(() => setBanner(null), 3000)
  }

  const handleReset = () => {
    localStorage.removeItem('dayflow.draft.add_employee')
    reset({
      first_name: '',
      last_name: '',
      email: '',
      password: '',
      phone: '',
      address: '',
      department: 'Engineering',
      designation: 'Software Engineer',
      employment_type: 'FULL_TIME',
      date_of_joining: new Date().toISOString().split('T')[0],
      manager_id: '',
      role: 'EMPLOYEE',
      avatar_url: '',
    })
    setBanner('Form reset to defaults.')
    setTimeout(() => setBanner(null), 3000)
  }


  const passwordVal = watch('password') || ''

  const onSubmit = async (values: EmployeeCreateValues) => {
    setBanner(null)
    try {
      const payload = {
        first_name: values.first_name.trim(),
        last_name: values.last_name.trim(),
        email: values.email.trim().toLowerCase(),
        password: values.password,
        phone: values.phone.trim() || null,
        address: values.address.trim() || null,
        department: values.department.trim(),
        designation: values.designation.trim(),
        employment_type: values.employment_type,
        date_of_joining: values.date_of_joining,
        manager_id: values.manager_id ? Number(values.manager_id) : null,
        role: values.role,
        avatar_url: values.avatar_url.trim() || null,
      }

      const created = await api.post<EmployeeDetail>('/employees', payload)
      navigate(`/admin/employees/${created.id}`)
    } catch (err) {
      if (err instanceof ApiError) {
        Object.entries(err.fields).forEach(([field, message]) =>
          setError(field as keyof EmployeeCreateValues, { message }),
        )
        setBanner(Object.keys(err.fields).length ? null : err.message)
      } else {
        setBanner('Something went wrong creating the employee account. Try again.')
      }
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <Link
          to="/admin/employees"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-flow-600 transition-colors"
        >
          <Icon icon="mdi:arrow-left" className="h-4 w-4" />
          <span>Back to Employees</span>
        </Link>
      </div>

      <PageHeader
        title="Add New Employee"
        description="Enter core employee details below. Salary structure and documents can be configured later."
      />

      <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <FormBanner message={banner} />

        {/* 1. Basic Account & Personal Info */}
        <Card>
          <CardHeader
            title="Personal & Account Information"
            subtitle="Names, work email, and account credentials."
          />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="First Name *" htmlFor="first_name" error={errors.first_name?.message}>
              <Input
                id="first_name"
                placeholder="e.g. Sarah"
                invalid={!!errors.first_name}
                {...register('first_name')}
              />
            </Field>

            <Field label="Last Name *" htmlFor="last_name" error={errors.last_name?.message}>
              <Input
                id="last_name"
                placeholder="e.g. Jenkins"
                invalid={!!errors.last_name}
                {...register('last_name')}
              />
            </Field>

            <Field label="Work Email *" htmlFor="email" error={errors.email?.message}>
              <Input
                id="email"
                type="email"
                placeholder="sarah.jenkins@company.com"
                invalid={!!errors.email}
                {...register('email')}
              />
            </Field>

            <Field label="Phone Number" htmlFor="phone" error={errors.phone?.message} hint="7–20 digits">
              <Input
                id="phone"
                type="tel"
                placeholder="+1 555 234 5678"
                invalid={!!errors.phone}
                {...register('phone')}
              />
            </Field>

            <div className="sm:col-span-2">
              <Field label="Password *" htmlFor="password" error={errors.password?.message}>
                <Input
                  id="password"
                  type="password"
                  placeholder="Set initial password"
                  invalid={!!errors.password}
                  {...register('password')}
                />
              </Field>

              {/* Password checklist */}
              <div className="mt-2.5 grid grid-cols-2 gap-1.5 rounded-xl bg-slate-50 p-3 sm:grid-cols-3">
                {PASSWORD_RULES.map((rule) => {
                  const pass = rule.test(passwordVal)
                  return (
                    <span
                      key={rule.label}
                      className={`inline-flex items-center gap-1.5 text-[11px] font-medium transition-colors ${
                        pass ? 'text-emerald-700' : 'text-slate-500'
                      }`}
                    >
                      <Icon
                        icon={pass ? 'mdi:check-circle' : 'mdi:circle-outline'}
                        className={`h-3.5 w-3.5 ${pass ? 'text-emerald-600' : 'text-slate-400'}`}
                      />
                      {rule.label}
                    </span>
                  )
                })}
              </div>
            </div>

            <div className="sm:col-span-2">
              <Field label="Residential Address" htmlFor="address" error={errors.address?.message}>
                <Input
                  id="address"
                  placeholder="Street, City, State, ZIP"
                  invalid={!!errors.address}
                  {...register('address')}
                />
              </Field>
            </div>

            <div className="sm:col-span-2">
              <Field label="Avatar / Profile Image URL" htmlFor="avatar_url" error={errors.avatar_url?.message} hint="Optional direct image URL">
                <Input
                  id="avatar_url"
                  placeholder="https://images.unsplash.com/..."
                  invalid={!!errors.avatar_url}
                  {...register('avatar_url')}
                />
              </Field>
            </div>
          </div>
        </Card>

        {/* 2. Employment & Role Details */}
        <Card>
          <CardHeader
            title="Employment & Role Settings"
            subtitle="Department, job title, joining date and system access level."
          />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Department *" htmlFor="department" error={errors.department?.message}>
              <Select id="department" invalid={!!errors.department} {...register('department')}>
                {departments.length > 0 ? (
                  departments.map((dept) => (
                    <option key={dept.id} value={dept.name}>
                      {dept.name} ({dept.code})
                    </option>
                  ))
                ) : (
                  <>
                    <option value="Engineering">Engineering</option>
                    <option value="Sales">Sales</option>
                    <option value="Human Resources">Human Resources</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Finance">Finance</option>
                  </>
                )}
              </Select>
            </Field>

            <Field label="Designation / Job Title *" htmlFor="designation" error={errors.designation?.message}>
              <Input
                id="designation"
                placeholder="e.g. Senior Software Engineer"
                invalid={!!errors.designation}
                {...register('designation')}
              />
            </Field>

            <Field label="Employment Type *" htmlFor="employment_type" error={errors.employment_type?.message}>
              <Select id="employment_type" invalid={!!errors.employment_type} {...register('employment_type')}>
                <option value="FULL_TIME">Full Time</option>
                <option value="PART_TIME">Part Time</option>
                <option value="CONTRACT">Contract</option>
                <option value="INTERN">Intern</option>
              </Select>
            </Field>

            <Field label="Date of Joining *" htmlFor="date_of_joining" error={errors.date_of_joining?.message}>
              <Input
                id="date_of_joining"
                type="date"
                invalid={!!errors.date_of_joining}
                {...register('date_of_joining')}
              />
            </Field>

            <Field label="Reports To (Manager)" htmlFor="manager_id" error={errors.manager_id?.message}>
              <Select id="manager_id" invalid={!!errors.manager_id} {...register('manager_id')}>
                <option value="">No Manager (Top level)</option>
                {managers.map((mgr) => (
                  <option key={mgr.id} value={mgr.id}>
                    {mgr.full_name} ({mgr.designation || mgr.department})
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="System Access Role *" htmlFor="role" error={errors.role?.message}>
              <Select id="role" invalid={!!errors.role} {...register('role')}>
                <option value="EMPLOYEE">Employee (Standard Access)</option>
                <option value="ADMIN">HR Admin (Full HR Access)</option>
              </Select>
            </Field>
          </div>
        </Card>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button type="button" variant="secondary" size="sm" onClick={saveDraft}>
              Save Draft
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={handleReset}>
              Reset
            </Button>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Link to="/admin/employees">
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </Link>
            <Button type="submit" loading={isSubmitting} icon={<Icon icon="mdi:account-plus" className="h-4 w-4" />}>
              Create Employee
            </Button>
          </div>
        </div>

      </form>
    </div>
  )
}
