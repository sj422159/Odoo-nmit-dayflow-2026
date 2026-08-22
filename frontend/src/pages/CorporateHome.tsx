import { useState, type FormEvent } from 'react'
import { LogOut, UserPlus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { ApiError, api } from '@/api/client'
import { PageHeader } from '@/components/PageHeader'
import { Button, Card, CardHeader, Field, FormBanner, Input } from '@/components/ui/Primitives'
import { useAuth } from '@/context/AuthContext'

export default function CorporateHome() {
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [adminConfirm, setAdminConfirm] = useState('')
  const [adminFirst, setAdminFirst] = useState('')
  const [adminLast, setAdminLast] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const createAdmin = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setMessage(null)
    try {
      const result = await api.post<{ message: string }>('/auth/admins', {
        email: adminEmail,
        password: adminPassword,
        confirm_password: adminConfirm,
        first_name: adminFirst,
        last_name: adminLast,
      })
      setMessage(result.message)
      setAdminEmail('')
      setAdminPassword('')
      setAdminConfirm('')
      setAdminFirst('')
      setAdminLast('')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to create HR admin.')
    }
  }

  return (
    <>
      <PageHeader
        title="Corporate access"
        description="Manage HR administrators and approve employee login requests."
        actions={<Button variant="secondary" size="sm" onClick={() => { signOut(); navigate('/corporate/signin', { replace: true }) }} icon={<LogOut className="h-4 w-4" />}>Sign out</Button>}
      />
      <div className="max-w-2xl">
        <Card>
          <CardHeader title="Add HR administrator" subtitle="Only corporate administrators can create HR access." />
          <form onSubmit={createAdmin} className="grid gap-4 p-5 sm:grid-cols-2">
            <FormBanner message={error} />
            {message && <p role="status" className="sm:col-span-2 rounded-xl bg-present-soft px-3.5 py-3 text-sm font-semibold text-present">{message}</p>}
            <Field label="First name" htmlFor="admin-first" required><Input id="admin-first" value={adminFirst} onChange={(e) => setAdminFirst(e.target.value)} required /></Field>
            <Field label="Last name" htmlFor="admin-last" required><Input id="admin-last" value={adminLast} onChange={(e) => setAdminLast(e.target.value)} required /></Field>
            <Field label="Work email" htmlFor="admin-email" required><Input id="admin-email" type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} required /></Field>
            <div />
            <Field label="Temporary password" htmlFor="admin-password" required><Input id="admin-password" type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} required /></Field>
            <Field label="Repeat password" htmlFor="admin-confirm" required><Input id="admin-confirm" type="password" value={adminConfirm} onChange={(e) => setAdminConfirm(e.target.value)} required /></Field>
            <div className="sm:col-span-2"><Button type="submit" icon={<UserPlus className="h-4 w-4" />}>Create HR admin</Button></div>
          </form>
        </Card>
      </div>
    </>
  )
}
