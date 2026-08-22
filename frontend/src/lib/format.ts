import { format, formatDistanceToNow, parseISO } from 'date-fns'
import type { AttendanceStatus, LeaveStatus, LeaveType } from '@/api/types'

export const parse = (value: string) => parseISO(value)

export const fmtDate = (value: string | null | undefined, pattern = 'd MMM yyyy') =>
  value ? format(parseISO(value), pattern) : '—'

export const fmtTime = (value: string | null | undefined) =>
  value ? format(parseISO(value), 'HH:mm') : '—'

export const fmtRelative = (value: string) => formatDistanceToNow(parseISO(value), { addSuffix: true })

export function fmtDuration(minutes: number): string {
  if (!minutes) return '0h 00m'
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return `${hours}h ${String(rest).padStart(2, '0')}m`
}

export function fmtMoney(amount: string | number, currency = 'USD'): string {
  const value = typeof amount === 'string' ? Number(amount) : amount
  if (Number.isNaN(value)) return '—'
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value)
}

export const monthName = (month: number) =>
  format(new Date(2000, Math.max(month - 1, 0), 1), 'MMMM')

export const STATUS_LABEL: Record<AttendanceStatus, string> = {
  PRESENT: 'Present',
  ABSENT: 'Absent',
  HALF_DAY: 'Half day',
  LEAVE: 'On leave',
}

/** One source of truth for status colour across pills, ribbons and charts. */
export const STATUS_TONE: Record<AttendanceStatus, { chip: string; bar: string; hex: string }> = {
  PRESENT: { chip: 'bg-present-soft text-present', bar: 'bg-present', hex: '#1F9D6B' },
  HALF_DAY: { chip: 'bg-pending-soft text-pending', bar: 'bg-pending', hex: '#C97A0C' },
  ABSENT: { chip: 'bg-absent-soft text-absent', bar: 'bg-absent', hex: '#D6455B' },
  LEAVE: { chip: 'bg-flow-50 text-flow-600', bar: 'bg-flow-400', hex: '#616FEE' },
}

export const LEAVE_STATUS_TONE: Record<LeaveStatus, string> = {
  PENDING: 'bg-pending-soft text-pending',
  APPROVED: 'bg-present-soft text-present',
  REJECTED: 'bg-absent-soft text-absent',
  CANCELLED: 'bg-away-soft text-away',
}

export const LEAVE_TYPE_LABEL: Record<LeaveType, string> = {
  PAID: 'Paid leave',
  SICK: 'Sick leave',
  UNPAID: 'Unpaid leave',
}

export const titleCase = (value: string) =>
  value.toLowerCase().replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())

export const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')

export const isoDate = (date: Date) => format(date, 'yyyy-MM-dd')
