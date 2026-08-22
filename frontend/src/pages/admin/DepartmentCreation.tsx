import { FormEvent, useCallback, useEffect, useState } from 'react'
import { Building2, Plus } from 'lucide-react'
import { ApiError, api } from '@/api/client'
import type { Department } from '@/api/types'
import { PageHeader } from '@/components/PageHeader'
import { Button, Card, CardHeader, EmptyState, Field, FormBanner, Input } from '@/components/ui/Primitives'

export default function DepartmentCreation() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    api.get<Department[]>('/employees/departments').then(setDepartments).catch(() => setDepartments([]))
  }, [])

  useEffect(() => { load() }, [load])

  const create = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setSuccess(null)
    setSaving(true)
    try {
      const department = await api.post<Department>('/employees/departments', { name, code })
      setDepartments((current) => [...current, department].sort((a, b) => a.name.localeCompare(b.name)))
      setName('')
      setCode('')
      setSuccess(`${department.name} created. New IDs will start with ${department.code}-0001.`)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to create this department.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <PageHeader title="Department creation" description="Create the departments HR can assign during employee approval." />
      <div className="grid gap-5 lg:grid-cols-[22rem_1fr] lg:items-start">
        <Card>
          <CardHeader title="New department" subtitle="Each code becomes the prefix of employee IDs." />
          <form onSubmit={create} className="grid gap-4 p-5">
            <FormBanner message={error} />
            {success && <p role="status" className="rounded-xl bg-present-soft px-3.5 py-3 text-sm font-semibold text-present">{success}</p>}
            <Field label="Department name" htmlFor="department-name" required>
              <Input id="department-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Engineering" required />
            </Field>
            <Field label="Unique department code" htmlFor="department-code" hint="2-8 letters, for example ENG." required>
              <Input id="department-code" value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="ENG" pattern="[A-Z]{2,8}" required />
            </Field>
            <Button type="submit" loading={saving} icon={<Plus className="h-4 w-4" />}>Create department</Button>
          </form>
        </Card>

        <Card>
          <CardHeader title="Available departments" subtitle="The next number is reserved when an employee is approved." />
          {!departments.length ? (
            <EmptyState title="No departments yet" description="Create the first department to start assigning scoped employee IDs." icon={<Building2 className="h-7 w-7" />} />
          ) : (
            <ul className="divide-y divide-slate-150">
              {departments.map((department) => (
                <li key={department.id} className="flex items-center justify-between gap-4 px-5 py-4">
                  <div><p className="font-semibold text-ink">{department.name}</p><p className="text-sm text-away">{department.code} · next employee ID {department.code}-{String(department.next_employee_number).padStart(4, '0')}</p></div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  )
}