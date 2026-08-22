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

export function numberToWords(num: number | string): string {
  const n = typeof num === 'string' ? Number(num) : num
  if (Number.isNaN(n) || n === 0) return 'Zero'

  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ]
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

  function inWords(val: number): string {
    if (val < 20) return a[val]
    if (val < 100) return b[Math.floor(val / 10)] + (val % 10 ? ' ' + a[val % 10] : '')
    if (val < 1000) return a[Math.floor(val / 100)] + ' Hundred' + (val % 100 ? ' ' + inWords(val % 100) : '')
    if (val < 100000) return inWords(Math.floor(val / 1000)) + ' Thousand' + (val % 1000 ? ' ' + inWords(val % 1000) : '')
    if (val < 10000000) return inWords(Math.floor(val / 100000)) + ' Lakh' + (val % 100000 ? ' ' + inWords(val % 100000) : '')
    return inWords(Math.floor(val / 10000000)) + ' Crore' + (val % 10000000 ? ' ' + inWords(val % 10000000) : '')
  }

  const integerPart = Math.floor(n)
  const decimalPart = Math.round((n - integerPart) * 100)

  let result = inWords(integerPart)
  if (decimalPart > 0) {
    result += ' and ' + inWords(decimalPart) + ' Cents'
  }
  return result + ' Only'
}

