import { useCallback, useEffect, useState } from 'react'
import { Save } from 'lucide-react'
import Swal from 'sweetalert2'
import { api } from '@/api/client'
import type { CompanySettings as CompanySettingsType } from '@/api/types'
import { PageHeader } from '@/components/PageHeader'
import {
  Button,
  Card,
  CardHeader,
  Field,
  Input,
  Skeleton,
} from '@/components/ui/Primitives'

export default function CompanySettings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Form State
  const [workdayStart, setWorkdayStart] = useState('09:00')
  const [workdayMinutes, setWorkdayMinutes] = useState('480')
  const [halfDayMinutes, setHalfDayMinutes] = useState('240')
  const [annualPaidLeave, setAnnualPaidLeave] = useState('18')
  const [annualSickLeave, setAnnualSickLeave] = useState('10')

  const loadSettings = useCallback(async () => {
    try {
      const data = await api.get<CompanySettingsType>('/settings')
      setWorkdayStart(data.workday_start)
      setWorkdayMinutes(data.workday_minutes.toString())
      setHalfDayMinutes(data.half_day_minutes.toString())
      setAnnualPaidLeave(data.annual_paid_leave_days.toString())
      setAnnualSickLeave(data.annual_sick_leave_days.toString())
    } catch {
      // Fallback
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      await api.put<CompanySettingsType>('/settings', {
        workday_start: workdayStart.trim(),
        workday_minutes: parseInt(workdayMinutes, 10) || 480,
        half_day_minutes: parseInt(halfDayMinutes, 10) || 240,
        annual_paid_leave_days: parseInt(annualPaidLeave, 10) || 18,
        annual_sick_leave_days: parseInt(annualSickLeave, 10) || 10,
      })

      Swal.fire({
        icon: 'success',
        title: 'Settings Saved!',
        text: 'Company workday parameters and leave allowances updated successfully.',
        timer: 2000,
        showConfirmButton: false,
      })
    } catch {
      Swal.fire({
        icon: 'error',
        title: 'Failed to Save Settings',
        text: 'Please check your input values and try again.',
        confirmButtonColor: '#0284c7',
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  return (
    <>
      <PageHeader
        title="Company Settings"
        description="Configure workday start time, standard daily hours, and annual leave allowances."
      />

      <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
        {/* Workday & Attendance Rules Card */}
        <Card className="p-6">
          <CardHeader
            title="Workday & Attendance Rules"
            subtitle="Define standard office start time and attendance calculation thresholds."
          />
          <div className="p-6 pt-0 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Workday Start Time *" hint="Default office check-in benchmark time (e.g. 09:00).">
                <div className="relative">
                  <Input
                    type="time"
                    value={workdayStart}
                    onChange={(e) => setWorkdayStart(e.target.value)}
                    required
                    className="text-xs font-semibold"
                  />
                </div>
              </Field>

              <Field label="Full Workday Duration (Minutes) *" hint="Standard daily working minutes (480 = 8 hours).">
                <Input
                  type="number"
                  min={60}
                  max={1440}
                  value={workdayMinutes}
                  onChange={(e) => setWorkdayMinutes(e.target.value)}
                  required
                  className="text-xs font-semibold"
                />
              </Field>

              <Field label="Half-Day Threshold (Minutes) *" hint="Work duration below which counts as half-day (240 = 4 hours).">
                <Input
                  type="number"
                  min={30}
                  max={720}
                  value={halfDayMinutes}
                  onChange={(e) => setHalfDayMinutes(e.target.value)}
                  required
                  className="text-xs font-semibold"
                />
              </Field>
            </div>
          </div>
        </Card>

        {/* Annual Leave Allowances Card */}
        <Card className="p-6">

          <CardHeader
            title="Annual Leave Allowances"
            subtitle="Configure default yearly leave allowances allocated to newly onboarded employees."
          />
          <div className="p-6 pt-0 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Annual Paid Leave (Days) *" hint="Default yearly paid leave days allocation.">
                <Input
                  type="number"
                  min={0}
                  max={365}
                  value={annualPaidLeave}
                  onChange={(e) => setAnnualPaidLeave(e.target.value)}
                  required
                  className="text-xs font-semibold"
                />
              </Field>

              <Field label="Annual Sick Leave (Days) *" hint="Default yearly medical / sick leave days allocation.">
                <Input
                  type="number"
                  min={0}
                  max={365}
                  value={annualSickLeave}
                  onChange={(e) => setAnnualSickLeave(e.target.value)}
                  required
                  className="text-xs font-semibold"
                />
              </Field>
            </div>
          </div>
        </Card>

        {/* Submit Actions */}
        <div className="flex justify-end gap-3">
          <Button type="submit" loading={saving} className="font-bold flex items-center gap-2 px-6">
            <Save className="h-4 w-4" />
            <span>Save Company Settings</span>
          </Button>
        </div>
      </form>
    </>
  )
}
