import { useCallback, useEffect, useRef, useState } from 'react'
import {

  Calendar,
  CalendarDays,
  Download,
  FileSpreadsheet,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import Swal from 'sweetalert2'
import { api } from '@/api/client'
import type { Holiday } from '@/api/types'
import { useAuth } from '@/context/AuthContext'
import { PageHeader } from '@/components/PageHeader'
import {
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Pill,
  Select,
  Skeleton,
} from '@/components/ui/Primitives'

import { fmtDate, titleCase } from '@/lib/format'

const DEFAULT_HOLIDAYS: Holiday[] = [
  { id: 1, name: "New Year's Day", date: '2026-01-01', day_of_week: 'Thursday', type: 'PUBLIC', description: 'Global holiday celebrating the start of the year', is_active: true, created_at: '' },
  { id: 2, name: 'Republic Day', date: '2026-01-26', day_of_week: 'Monday', type: 'PUBLIC', description: 'National holiday celebrating the Constitution', is_active: true, created_at: '' },
  { id: 3, name: 'Good Friday', date: '2026-04-03', day_of_week: 'Friday', type: 'PUBLIC', description: 'Christian holiday observing the crucifixion of Jesus', is_active: true, created_at: '' },
  { id: 4, name: 'May Day / Labor Day', date: '2026-05-01', day_of_week: 'Friday', type: 'COMPANY', description: 'International Workers Day', is_active: true, created_at: '' },
  { id: 5, name: 'Independence Day', date: '2026-08-15', day_of_week: 'Saturday', type: 'PUBLIC', description: 'National Independence Day', is_active: true, created_at: '' },
  { id: 6, name: 'Gandhi Jayanti', date: '2026-10-02', day_of_week: 'Friday', type: 'PUBLIC', description: 'Mahatma Gandhi Birth Anniversary', is_active: true, created_at: '' },
  { id: 7, name: 'Diwali / Deepavali', date: '2026-11-08', day_of_week: 'Sunday', type: 'PUBLIC', description: 'Festival of Lights', is_active: true, created_at: '' },
  { id: 8, name: 'Christmas Day', date: '2026-12-25', day_of_week: 'Friday', type: 'PUBLIC', description: 'Christmas celebration', is_active: true, created_at: '' },
]

export default function Holidays() {
  const { isAdmin } = useAuth()
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString())

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [importing, setImporting] = useState(false)

  // Form State
  const [formName, setFormName] = useState('')
  const [formDate, setFormDate] = useState('')
  const [formType, setFormType] = useState<'PUBLIC' | 'COMPANY' | 'OPTIONAL'>('PUBLIC')
  const [formDesc, setFormDesc] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadHolidays = useCallback(async () => {
    try {
      const data = await api.get<Holiday[]>(`/holidays?year=${yearFilter}`)
      setHolidays(data)
      localStorage.setItem(`dayflow.holidays.${yearFilter}`, JSON.stringify(data))
    } catch {
      // Offline Fallback
      const cached = localStorage.getItem(`dayflow.holidays.${yearFilter}`)
      if (cached) {
        setHolidays(JSON.parse(cached))
      } else {
        setHolidays(DEFAULT_HOLIDAYS)
      }
    } finally {
      setLoading(false)
    }
  }, [yearFilter])

  useEffect(() => {
    loadHolidays()
  }, [loadHolidays])

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName || !formDate) return

    setSaving(true)
    try {
      await api.post<Holiday>('/holidays', {
        name: formName.trim(),
        date: formDate,
        type: formType,
        description: formDesc.trim() || null,
      })

      Swal.fire({
        icon: 'success',
        title: 'Holiday Created!',
        text: `${formName} added to the company calendar.`,
        timer: 1800,
        showConfirmButton: false,
      })

      setFormName('')
      setFormDate('')
      setFormDesc('')
      setIsAddModalOpen(false)
      loadHolidays()
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Failed to Add Holiday',
        text: 'Please check your inputs and try again.',
        confirmButtonColor: '#0284c7',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteHoliday = async (id: number) => {
    const res = await Swal.fire({
      title: 'Delete Holiday?',
      text: 'Are you sure you want to remove this holiday from the schedule?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      confirmButtonText: 'Yes, Delete',
    })

    if (res.isConfirmed) {
      try {
        await api.delete(`/holidays/${id}`)
        setHolidays((prev) => prev.filter((h) => h.id !== id))
        Swal.fire('Deleted!', 'Holiday has been removed.', 'success')
      } catch {
        Swal.fire('Error', 'Failed to delete holiday.', 'error')
      }
    }
  }

  const handleExportXLSX = async () => {
    try {
      const response = await fetch('/api/v1/holidays/export', {
        headers: { Authorization: `Bearer ${localStorage.getItem('dayflow.access') || ''}` },
      })
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `company_holidays_${yearFilter}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
    } catch {
      Swal.fire('Error', 'Failed to download holiday spreadsheet.', 'error')
    }
  }

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImporting(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const imported = await api.post<Holiday[]>('/holidays/import', formData)

      Swal.fire({
        icon: 'success',
        title: 'Spreadsheet Imported!',
        text: `Successfully imported ${imported.length} holiday(s) from spreadsheet.`,
        confirmButtonColor: '#0284c7',
      })

      setIsImportModalOpen(false)
      loadHolidays()
    } catch {
      Swal.fire({
        icon: 'error',
        title: 'Import Failed',
        text: 'Please make sure your CSV/Excel file contains "Name" and "Date" columns.',
        confirmButtonColor: '#0284c7',
      })
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const filteredHolidays = holidays.filter((h) => {
    const matchesSearch = h.name.toLowerCase().includes(search.toLowerCase()) || (h.description && h.description.toLowerCase().includes(search.toLowerCase()))
    const matchesType = typeFilter === 'ALL' || h.type === typeFilter
    return matchesSearch && matchesType
  })

  // Find next upcoming holiday
  const todayStr = new Date().toISOString().split('T')[0]
  const upcomingHoliday = holidays.find((h) => h.date >= todayStr)

  return (
    <>
      <PageHeader
        title="Company Holiday Calendar"
        description="Official public, company, and optional holidays schedule."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportXLSX}
              className="flex items-center gap-1.5 font-bold shadow-xs text-xs"
            >
              <Download className="h-4 w-4 text-flow-600" />
              <span>Export XLSX / CSV</span>
            </Button>

            {isAdmin && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsImportModalOpen(true)}
                  className="flex items-center gap-1.5 font-bold shadow-xs text-xs"
                >
                  <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                  <span>Import XLSX</span>
                </Button>

                <Button
                  size="sm"
                  onClick={() => setIsAddModalOpen(true)}
                  className="flex items-center gap-1.5 font-bold shadow-xs text-xs"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Holiday</span>
                </Button>
              </>
            )}
          </div>
        }
      />

      {/* Top Highlights Banner */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-5">
        {/* Next Upcoming Holiday Card */}
        <Card className="p-5 border-l-4 border-l-flow-600 bg-linear-to-r from-flow-50/50 to-white">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-flow-100 text-flow-700">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <p className="text-eyebrow uppercase text-away font-bold">Next Holiday</p>
              {upcomingHoliday ? (
                <div>
                  <h4 className="font-bold text-ink text-sm mt-0.5">{upcomingHoliday.name}</h4>
                  <p className="text-xs font-semibold text-flow-700 mt-0.5">
                    {fmtDate(upcomingHoliday.date, 'EEEE, d MMMM')}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-away mt-0.5">No upcoming holidays scheduled</p>
              )}
            </div>
          </div>
        </Card>

        {/* Total Holidays Card */}
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-100 text-amber-800">
              <CalendarDays className="h-5 w-5" />
            </span>
            <div>
              <p className="text-eyebrow uppercase text-away font-bold">Total Holidays ({yearFilter})</p>
              <h3 className="text-xl font-extrabold text-ink mt-0.5">{holidays.length} Days</h3>
            </div>
          </div>
        </Card>

        {/* Public vs Company Breakdown */}
        <Card className="p-5">
          <p className="text-eyebrow uppercase text-away font-bold mb-2">Category Breakdown</p>
          <div className="flex flex-wrap gap-2 text-xs">
            <Pill tone="bg-emerald-100 text-emerald-800 font-bold">
              Public: {holidays.filter((h) => h.type === 'PUBLIC').length}
            </Pill>
            <Pill tone="bg-flow-100 text-flow-800 font-bold">
              Company: {holidays.filter((h) => h.type === 'COMPANY').length}
            </Pill>
            <Pill tone="bg-amber-100 text-amber-800 font-bold">
              Optional: {holidays.filter((h) => h.type === 'OPTIONAL').length}
            </Pill>
          </div>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card>
        {/* Filters Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-5 border-b border-slate-150 bg-slate-50/60">
          <div className="flex items-center gap-3 flex-1 min-w-[16rem]">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-away pointer-events-none" />
              <Input
                placeholder="Search holiday name or description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-xs"
              />
            </div>

            <Select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="text-xs w-36 py-2"
            >
              <option value="ALL">All Types</option>
              <option value="PUBLIC">Public</option>
              <option value="COMPANY">Company</option>
              <option value="OPTIONAL">Optional</option>
            </Select>

            <Select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="text-xs w-28 py-2 font-bold"
            >
              <option value="2026">Year 2026</option>
              <option value="2025">Year 2025</option>
            </Select>
          </div>
        </div>

        {/* Holiday Table */}
        <div className="p-5">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : filteredHolidays.length === 0 ? (
            <EmptyState
              title="No holidays found"
              description="No holidays match your search filter for this year."
              icon={<Calendar className="h-8 w-8 text-away" />}
            />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-150 bg-slate-50 text-away uppercase font-semibold">
                  <tr>
                    <th className="px-4 py-3">Holiday Name</th>
                    <th className="px-4 py-3">Date & Day</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Description</th>
                    {isAdmin && <th className="px-4 py-3 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150">
                  {filteredHolidays.map((h) => {
                    const isUpcoming = h.date >= todayStr
                    return (
                      <tr key={h.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 font-bold text-ink">
                          <div className="flex items-center gap-2">
                            <span>{h.name}</span>
                            {isUpcoming && (
                              <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-2xs" title="Upcoming" />
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-bold text-slate-800">{fmtDate(h.date, 'd MMMM yyyy')}</p>
                          <p className="text-[11px] font-semibold text-away">{h.day_of_week}</p>
                        </td>
                        <td className="px-4 py-3">
                          <Pill
                            tone={
                              h.type === 'PUBLIC'
                                ? 'bg-emerald-100 text-emerald-800'
                                : h.type === 'COMPANY'
                                ? 'bg-flow-100 text-flow-800'
                                : 'bg-amber-100 text-amber-800'
                            }
                          >
                            {titleCase(h.type)}
                          </Pill>
                        </td>
                        <td className="px-4 py-3 text-away max-w-xs truncate">
                          {h.description || 'Official holiday.'}
                        </td>
                        {isAdmin && (
                          <td className="px-4 py-3 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteHoliday(h.id)}
                              className="p-1 text-slate-400 hover:text-rose-600"
                              title="Delete Holiday"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>

      {/* Add Holiday Modal Dialog */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-up">
          <form onSubmit={handleAddHoliday} className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl space-y-4 p-6">
            <div className="flex items-center justify-between border-b border-slate-150 pb-3">
              <h3 className="font-bold text-ink text-base flex items-center gap-2">
                <Plus className="h-5 w-5 text-flow-600" /> Add New Holiday
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-xl p-1 text-away hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <Field label="Holiday Name *">
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Labor Day / Annual Foundation Day"
                required
                className="text-xs"
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Holiday Date *">
                <Input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  required
                  className="text-xs"
                />
              </Field>

              <Field label="Category *">
                <Select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as any)}
                  className="text-xs"
                >
                  <option value="PUBLIC">Public Holiday</option>
                  <option value="COMPANY">Company Holiday</option>
                  <option value="OPTIONAL">Optional Holiday</option>
                </Select>
              </Field>
            </div>

            <Field label="Description (Optional)">
              <Input
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                placeholder="Short note or observance details..."
                className="text-xs"
              />
            </Field>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-150">
              <Button type="button" variant="secondary" size="sm" onClick={() => setIsAddModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={saving} size="sm" className="font-bold">
                Save Holiday
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Import XLSX / CSV Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-up">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-150 pb-3">
              <h3 className="font-bold text-ink text-base flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-emerald-600" /> Import Holiday Spreadsheet
              </h3>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="rounded-xl p-1 text-away hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-away leading-relaxed">
              Upload a <b>.xlsx</b> or <b>.csv</b> file containing company holidays. The file must include <b>Name</b> and <b>Date</b> (YYYY-MM-DD) columns.
            </p>

            <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-2xl p-8 bg-slate-50/70 text-center hover:bg-slate-100/70 transition-colors">
              <Upload className="h-10 w-10 text-emerald-600 mb-2" />
              <p className="text-xs font-bold text-ink">Click to select XLSX / CSV file</p>
              <p className="text-[11px] text-away mt-1">Supports Excel .xlsx, .xls, and .csv files</p>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImportFile}
                accept=".csv,.xlsx,.xls"
                className="hidden"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                loading={importing}
                className="mt-4 text-xs font-bold shadow-xs"
              >
                Select Spreadsheet
              </Button>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-150">
              <Button variant="secondary" size="sm" onClick={() => setIsImportModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
