import { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Icon } from '@iconify/react'
import Swal from 'sweetalert2'
import {
  Briefcase,
  Camera,
  Download,
  Eye,
  FileText,
  Mail,
  Paperclip,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
  UploadCloud,
  UserRound,
  X,
} from 'lucide-react'
import { ApiError, api } from '@/api/client'
import type { EmployeeDetail } from '@/api/types'
import { useAsync } from '@/hooks/useAsync'
import { PageHeader } from '@/components/PageHeader'
import {
  Button,
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  Field,
  FormBanner,
  Input,
  Pill,
  Select,
  Skeleton,
} from '@/components/ui/Primitives'

import { profileSchema, type ProfileValues } from '@/lib/validation'
import { fmtDate, fmtMoney, initials, titleCase } from '@/lib/format'
import {
  cacheDocumentBlob,
  getCachedDocumentBlob,
  queueOfflineUpload,
} from '@/lib/offlineQueue'



export interface EmployeeDocument {
  id: string
  doc_type: string
  title: string
  file_name: string
  file_url: string
  file_size: string
  uploaded_at: string
  status?: 'QUEUED' | 'UPLOADED'
}


const DOCUMENT_TYPES = [
  'National ID / Passport',
  'Offer Letter / Employment Contract',
  'Tax Document / W-9 / PAN',
  'Educational Certificate',
  'Resume / CV',
  'Other Document',
]

const DEFAULT_DOCUMENTS: EmployeeDocument[] = [
  {
    id: 'doc-1',
    doc_type: 'National ID / Passport',
    title: 'Government Identity Card',
    file_name: 'National_ID_Scan_2026.pdf',
    file_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    file_size: '1.2 MB',
    uploaded_at: '2026-01-15',
  },
  {
    id: 'doc-2',
    doc_type: 'Offer Letter / Employment Contract',
    title: 'Signed Employment Agreement',
    file_name: 'TeCryst_Offer_Letter_Signed.pdf',
    file_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    file_size: '840 KB',
    uploaded_at: '2026-01-10',
  },
]

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB

export default function Profile() {
  const [banner, setBanner] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)

  // Document Management States
  const [documents, setDocuments] = useState<EmployeeDocument[]>([])
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [docType, setDocType] = useState('National ID / Passport')
  const [docTitle, setDocTitle] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadingDoc, setUploadingDoc] = useState(false)
  const [inspectDoc, setInspectDoc] = useState<EmployeeDocument | null>(null)

  const load = useCallback(() => api.get<EmployeeDetail>('/employees/me'), [])
  const { data, loading, error, reload, setData } = useAsync(load, [])

  // Load documents from localStorage on mount
  useEffect(() => {
    if (!data) return
    const key = `dayflow.docs.${data.id}`
    const stored = localStorage.getItem(key)
    if (stored) {
      try {
        setDocuments(JSON.parse(stored))
      } catch {
        setDocuments(DEFAULT_DOCUMENTS)
      }
    } else {
      setDocuments(DEFAULT_DOCUMENTS)
    }

    const handleDocsUpdated = () => {
      setDocuments((prev) =>
        prev.map((d) => (d.status === 'QUEUED' ? { ...d, status: 'UPLOADED' } : d)),
      )
    }
    window.addEventListener('dayflow:documents-updated', handleDocsUpdated)
    return () => window.removeEventListener('dayflow:documents-updated', handleDocsUpdated)
  }, [data])


  const {
    register,
    handleSubmit,
    reset,
    setValue,
    getValues,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    mode: 'onChange',
    values: data
      ? { phone: data.phone ?? '', address: data.address ?? '', avatar_url: data.avatar_url ?? '' }
      : undefined,
  })

  // Change Profile Photo Handler
  const handlePhotoSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > MAX_FILE_SIZE_BYTES) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2)
      console.warn(`Selected avatar file size (${sizeMB} MB) exceeds maximum allowed limit (10MB).`)
      Swal.fire({
        icon: 'error',
        title: 'File Too Large!',
        text: `The selected photo (${sizeMB} MB) exceeds the maximum allowed limit of 10MB. Please choose a smaller image.`,
        confirmButtonColor: '#0284c7',
      })
      if (photoInputRef.current) photoInputRef.current.value = ''
      return
    }

    const formData = new FormData()
    formData.append('file', file)

    try {
      const updated = await api.post<EmployeeDetail>('/employees/me/avatar', formData)
      setData(updated)
      setValue('avatar_url', updated.avatar_url ?? '', { shouldDirty: false })
      setOk('Profile picture uploaded & saved to server!')

      Swal.fire({
        icon: 'success',
        title: 'Photo Uploaded!',
        text: 'Your profile picture has been stored on the server.',
        timer: 2200,
        showConfirmButton: false,
      })
      setTimeout(() => setOk(null), 3000)
    } catch (err) {
      console.error('Avatar Upload Error:', err)
      const errorMsg = err instanceof ApiError ? err.message : 'Failed to save profile picture. Try again.'
      setBanner(errorMsg)

      Swal.fire({
        icon: 'error',
        title: 'Upload Error',
        text: errorMsg,
        confirmButtonColor: '#0284c7',
      })
    } finally {
      if (photoInputRef.current) photoInputRef.current.value = ''
    }
  }

  // Upload Document Handler (Online or Offline Queue)
  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile && !docTitle) return

    if (selectedFile && selectedFile.size > MAX_FILE_SIZE_BYTES) {
      const sizeMB = (selectedFile.size / (1024 * 1024)).toFixed(2)
      Swal.fire({
        icon: 'error',
        title: 'Document Too Large!',
        text: `The selected document (${sizeMB} MB) exceeds the maximum size limit of 10MB. Please select a smaller file.`,
        confirmButtonColor: '#0284c7',
      })
      return
    }

    setUploadingDoc(true)
    const fileObj = selectedFile
    const isOffline = !navigator.onLine
    const fileUrl = fileObj ? URL.createObjectURL(fileObj) : 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
    const fileName = fileObj ? fileObj.name : `${docTitle.toLowerCase().replace(/\s+/g, '_')}.pdf`
    const fileSize = fileObj ? `${(fileObj.size / (1024 * 1024)).toFixed(2)} MB` : '500 KB'
    const docId = `doc-${Date.now()}`

    if (isOffline && fileObj) {
      // Save offline in IndexedDB
      await queueOfflineUpload({
        doc_type: docType,
        title: docTitle.trim() || docType,
        file_name: fileName,
        file_blob: fileObj,
        file_size: fileSize,
      })
      window.dispatchEvent(new CustomEvent('dayflow:queue-updated'))

      const newDoc: EmployeeDocument = {
        id: docId,
        doc_type: docType,
        title: docTitle.trim() || docType,
        file_name: fileName,
        file_url: fileUrl,
        file_size: fileSize,
        uploaded_at: new Date().toISOString().split('T')[0],
        status: 'QUEUED',
      }

      const updated = [newDoc, ...documents]
      setDocuments(updated)
      if (data) localStorage.setItem(`dayflow.docs.${data.id}`, JSON.stringify(updated))

      Swal.fire({
        icon: 'warning',
        title: 'Saved Offline!',
        text: 'You are currently offline. Document has been queued locally in IndexedDB and will auto-upload when connection returns.',
        confirmButtonColor: '#0284c7',
      })
    } else {
      // Cache blob for offline viewing if online
      if (fileObj) {
        await cacheDocumentBlob(docId, fileName, fileObj, fileObj.type)
      }

      const newDoc: EmployeeDocument = {
        id: docId,
        doc_type: docType,
        title: docTitle.trim() || docType,
        file_name: fileName,
        file_url: fileUrl,
        file_size: fileSize,
        uploaded_at: new Date().toISOString().split('T')[0],
        status: 'UPLOADED',
      }

      const updated = [newDoc, ...documents]
      setDocuments(updated)
      if (data) localStorage.setItem(`dayflow.docs.${data.id}`, JSON.stringify(updated))

      Swal.fire({
        icon: 'success',
        title: 'Document Uploaded!',
        text: 'Document saved and cached locally for offline viewing.',
        timer: 2000,
        showConfirmButton: false,
      })
    }

    setDocTitle('')
    setSelectedFile(null)
    setUploadingDoc(false)
    setIsUploadModalOpen(false)
  }

  // View Document Handler (with IndexedDB Cached Viewer support)
  const handleInspectDocument = async (doc: EmployeeDocument) => {
    try {
      const cached = await getCachedDocumentBlob(doc.id)
      if (cached && cached.file_blob) {
        const cachedUrl = URL.createObjectURL(cached.file_blob)
        setInspectDoc({ ...doc, file_url: cachedUrl })
        return
      }
    } catch {
      // Fallback to default file_url if IndexedDB read fails
    }
    setInspectDoc(doc)
  }


  // Delete Document Handler
  const handleDeleteDoc = (id: string) => {
    const updated = documents.filter((d) => d.id !== id)
    setDocuments(updated)
    if (data) {
      localStorage.setItem(`dayflow.docs.${data.id}`, JSON.stringify(updated))
    }
  }

  const saveDraft = () => {
    const values = getValues()
    localStorage.setItem('dayflow.draft.profile', JSON.stringify(values))
    setOk('Draft saved to your browser.')
    setTimeout(() => setOk(null), 3000)
  }

  const handleReset = () => {
    localStorage.removeItem('dayflow.draft.profile')
    if (data) {
      reset({ phone: data.phone ?? '', address: data.address ?? '', avatar_url: data.avatar_url ?? '' })
    } else {
      reset({ phone: '', address: '', avatar_url: '' })
    }
    setBanner(null)
    setOk('Form reset to saved profile defaults.')
    setTimeout(() => setOk(null), 3000)
  }

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
      localStorage.removeItem('dayflow.draft.profile')
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
        <Skeleton className="h-48" />
        <Skeleton className="h-72" />
      </div>
    )
  }
  if (error || !data) return <ErrorState message={error ?? 'No data came back.'} onRetry={reload} />

  return (
    <>
      <PageHeader title="Your Profile & Verification Documents" description="Contact details, profile picture, and employee credentials." />

      <div className="grid gap-5 lg:grid-cols-[20rem_1fr] lg:items-start">
        {/* Left Column: Avatar & Quick Details */}
        <Card className="flex flex-col items-center gap-3 p-6 text-center">
          <div className="relative group">
            {data.avatar_url ? (
              <img
                src={data.avatar_url}
                alt={data.full_name}
                className="h-24 w-24 rounded-full object-cover ring-4 ring-flow-100 shadow-sm"
              />
            ) : (
              <span className="grid h-24 w-24 place-items-center rounded-full bg-flow-50 text-3xl font-bold text-flow-600 ring-4 ring-flow-100 shadow-sm">
                {initials(data.full_name)}
              </span>
            )}
          </div>

          {/* Change Photo Button */}
          <input
            type="file"
            ref={photoInputRef}
            onChange={handlePhotoSelect}
            accept="image/*"
            className="hidden"
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => photoInputRef.current?.click()}
            className="flex items-center gap-1.5 text-xs font-semibold shadow-xs"
          >
            <Camera className="h-3.5 w-3.5 text-flow-600" />
            <span>Change Photo</span>
          </Button>

          <div>
            <p className="font-bold text-ink text-base">{data.full_name}</p>
            <p className="text-xs font-mono font-bold text-away">{data.employee_code}</p>
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
            <p className="text-xs text-away">Joined {fmtDate(data.date_of_joining, 'd MMMM yyyy')}</p>
          </div>
        </Card>

        {/* Right Column: Editable Details & Document Upload Section */}
        <div className="flex flex-col gap-5">
          {/* Editable Details Form */}
          <Card>
            <CardHeader title="Editable Personal Info" subtitle="Phone, address and picture URL — role and salary are set by HR." />
            <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 p-5">
              <FormBanner message={banner} />
              {ok && (
                <p role="status" className="rounded-xl bg-present-soft px-3.5 py-3 text-sm font-semibold text-present">
                  {ok}
                </p>
              )}

              <Field label="Phone" htmlFor="phone" error={errors.phone?.message} hint="7–20 digits, optionally starting with +">
                <Input id="phone" type="tel" placeholder="e.g. +1 555 234 5678" invalid={!!errors.phone} {...register('phone')} />
              </Field>

              <Field label="Address" htmlFor="address" error={errors.address?.message} hint="Street, city, postal code">
                <Input id="address" placeholder="e.g. 155 Alder St, Springfield" invalid={!!errors.address} {...register('address')} />
              </Field>

              <Field label="Avatar Image URL" htmlFor="avatar_url" error={errors.avatar_url?.message} hint="Link to your profile image or click Change Photo above">
                <Input id="avatar_url" placeholder="e.g. https://images.unsplash.com/..." invalid={!!errors.avatar_url} {...register('avatar_url')} />
              </Field>

              <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-150">
                <div className="flex items-center gap-2">
                  <Button type="button" variant="secondary" size="sm" onClick={saveDraft}>
                    Save Draft
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={handleReset}>
                    Reset
                  </Button>
                </div>
                <Button type="submit" loading={isSubmitting} disabled={!isDirty} icon={<Save className="h-4 w-4" />}>
                  Save Changes
                </Button>
              </div>
            </form>
          </Card>

          {/* ======================================================== */}
          {/* Employee Documents & Viewer Module                       */}
          {/* ======================================================== */}
          <Card>
            <CardHeader
              title="Employee Documents & Verification"
              subtitle="Official identity records, tax forms, certificates, and contracts."
              action={
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setIsUploadModalOpen(true)}
                  className="flex items-center gap-1.5 text-xs font-bold shadow-xs"
                >
                  <Plus className="h-4 w-4" />
                  <span>Upload Document</span>
                </Button>
              }
            />

            <div className="p-5">
              {/* Uploaded Documents List */}
              {documents.length === 0 ? (
                <EmptyState
                  title="No documents uploaded yet"
                  description="Click 'Upload Document' above to add identity, tax, or employment records."
                  icon={<FileText className="h-7 w-7 text-away" />}
                />
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-150 bg-slate-50 text-away uppercase font-semibold">
                      <tr>
                        <th className="px-4 py-3">Category</th>
                        <th className="px-4 py-3">Title & File</th>
                        <th className="px-4 py-3">Upload Date</th>
                        <th className="px-4 py-3">Size</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150">
                      {documents.map((doc) => (
                        <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3 font-semibold text-slate-700">
                            <div className="flex flex-col gap-1 items-start">
                              <Pill tone="bg-flow-50 text-flow-700">{doc.doc_type}</Pill>
                              {doc.status === 'QUEUED' && (
                                <Pill tone="bg-amber-100 text-amber-900 border border-amber-300 font-bold">
                                  ⏳ Queued for Upload
                                </Pill>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-bold text-ink">{doc.title}</p>
                            <p className="text-[11px] text-away font-mono">{doc.file_name}</p>
                          </td>
                          <td className="px-4 py-3 text-away font-medium">{doc.uploaded_at}</td>
                          <td className="px-4 py-3 text-away font-medium">{doc.file_size}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleInspectDocument(doc)}
                                className="inline-flex items-center gap-1 text-[11px] font-bold py-1 px-2.5"
                              >
                                <Eye className="h-3.5 w-3.5 text-flow-600" />
                                <span>View Document</span>
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteDoc(doc.id)}
                                className="p-1 text-slate-400 hover:text-rose-600"
                                title="Delete Document"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Card>

          {/* Salary Structure Card (If available) */}
          {data.salary && (
            <Card>
              <CardHeader title="Salary Structure" subtitle={`Effective ${fmtDate(data.salary.effective_from, 'd MMM yyyy')}`} />
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

      {/* Upload Document Modal Dialog */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-up">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-150 px-6 py-4 bg-slate-50">
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-flow-50 text-flow-600 border border-flow-100">
                  <UploadCloud className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="font-bold text-ink text-base">Upload New Document</h3>
                  <p className="text-xs text-away">Attach official identity, tax, or employment records</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleUploadDocument} className="p-6 space-y-4">
              <Field label="Document Category *" htmlFor="modal-doc-type">
                <Select
                  id="modal-doc-type"
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="text-xs font-medium"
                >
                  {DOCUMENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Document Title / Note *" htmlFor="modal-doc-title">
                <Input
                  id="modal-doc-title"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="e.g. Passport Scan 2026 / W9 Form"
                  className="text-xs"
                  required
                />
              </Field>

              <Field label="File Attachment" htmlFor="modal-doc-file" hint="Supports PDF, PNG, JPG, DOCX (Max 10MB)">
                <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 bg-slate-50/50">
                  <Paperclip className="h-5 w-5 text-away shrink-0" />
                  <input
                    id="modal-doc-file"
                    type="file"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="text-xs text-ink-600 file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-flow-700 file:shadow-xs hover:file:bg-slate-100"
                  />
                  {selectedFile && (
                    <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5" />
                      {selectedFile.name}
                    </span>
                  )}
                </div>
              </Field>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-150">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsUploadModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  loading={uploadingDoc}
                  size="sm"
                  className="flex items-center gap-1.5 text-xs font-bold"
                >
                  <UploadCloud className="h-4 w-4" />
                  <span>Submit & Upload</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Document View Modal */}
      {inspectDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-up">
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-150 px-6 py-4 bg-slate-50">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-flow-50 text-flow-700 ring-2 ring-flow-100">
                  <FileText className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="font-bold text-ink text-base">{inspectDoc.title}</h3>
                  <p className="text-xs text-away">
                    {inspectDoc.doc_type} · Uploaded {inspectDoc.uploaded_at} ({inspectDoc.file_size})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectDoc(null)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Document Preview Area */}
            <div className="p-6 bg-slate-100/60 min-h-[16rem] flex flex-col items-center justify-center text-center">
              {inspectDoc.file_name.endsWith('.pdf') ? (
                <div className="w-full space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xs flex flex-col items-center gap-3">
                    <Icon icon="mdi:file-pdf-box" className="h-16 w-16 text-rose-500" />
                    <div>
                      <p className="font-bold text-ink text-sm">{inspectDoc.file_name}</p>
                      <p className="text-xs text-away mt-1">Official Document File ({inspectDoc.file_size})</p>
                    </div>
                    <a
                      href={inspectDoc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-2 rounded-xl bg-flow-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-flow-700 transition-colors"
                    >
                      <Download className="h-4 w-4" />
                      <span>Open & Download Document</span>
                    </a>
                  </div>
                </div>
              ) : (
                <div className="w-full flex flex-col items-center gap-3">
                  <img
                    src={inspectDoc.file_url}
                    alt={inspectDoc.title}
                    className="max-h-72 w-auto rounded-xl object-contain shadow-md border border-slate-200"
                  />
                  <p className="text-xs font-semibold text-slate-700">{inspectDoc.file_name}</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-slate-150 px-6 py-3 bg-slate-50">
              <span className="text-xs font-medium text-slate-500">Document ID: {inspectDoc.id}</span>
              <Button variant="secondary" size="sm" onClick={() => setInspectDoc(null)}>
                Close Viewer
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
