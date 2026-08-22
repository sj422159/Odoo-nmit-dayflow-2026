export type Role = 'CORPORATE' | 'HR_ADMIN' | 'ADMIN' | 'EMPLOYEE'
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LEAVE'
export type LeaveType = 'PAID' | 'SICK' | 'UNPAID'
export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERN'

export interface TokenPair {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
}

export interface SessionUser {
  id: number
  employee_code: string | null
  email: string
  role: Role
  is_verified: boolean
  is_active: boolean
  last_login_at: string | null
}

export interface Session {
  user: SessionUser
  employee_id: number | null
  full_name: string
  department: string | null
  designation: string | null
  avatar_url: string | null
}

export interface SalaryStructure {
  id: number
  currency: string
  basic: string
  hra: string
  allowances: string
  deductions: string
  effective_from: string
  gross_monthly: string
  net_monthly: string
}

export interface EmployeeSummary {
  id: number
  employee_code: string
  full_name: string
  email: string
  department: string
  designation: string
  employment_type: EmploymentType
  role: Role
  is_active: boolean
  avatar_url: string | null
  today_status: AttendanceStatus | null
}

export interface EmployeeDetail extends EmployeeSummary {
  first_name: string
  last_name: string
  phone: string | null
  address: string | null
  date_of_joining: string
  manager_name: string | null
  is_verified: boolean
  salary: SalaryStructure | null
  documents: { id: number; title: string; category: string; file_url: string }[]
}

export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  pages: number
}

export interface Department {
  id: number
  name: string
  code: string
  next_employee_number: number
  is_active: boolean
}

export interface AttendanceRecord {
  id: number
  employee_id: number
  work_date: string
  check_in: string | null
  check_out: string | null
  worked_minutes: number
  status: AttendanceStatus
  note: string | null
  employee_name: string | null
  employee_code: string | null
}

export interface AttendanceDay {
  work_date: string
  status: AttendanceStatus | null
  worked_minutes: number
  check_in: string | null
  check_out: string | null
}

export interface AttendanceSummary {
  range_start: string
  range_end: string
  present: number
  absent: number
  half_day: number
  leave: number
  total_hours: number
  attendance_rate: number
  days: AttendanceDay[]
}

export interface TodayStatus {
  work_date: string
  checked_in: boolean
  checked_out: boolean
  check_in: string | null
  check_out: string | null
  worked_minutes: number
  status: AttendanceStatus | null
}

export interface LeaveRequest {
  id: number
  employee_id: number
  employee_name: string | null
  employee_code: string | null
  department: string | null
  leave_type: LeaveType
  start_date: string
  end_date: string
  days: number
  remarks: string | null
  status: LeaveStatus
  review_comment: string | null
  reviewed_at: string | null
  reviewer_name: string | null
  created_at: string
}

export interface LeaveList extends Paginated<LeaveRequest> {
  pending_count: number
}

export interface LeaveBalance {
  year: number
  paid_total: number
  paid_used: number
  paid_remaining: number
  sick_total: number
  sick_used: number
  sick_remaining: number
  unpaid_used: number
  pending_days: number
}

export interface Payslip {
  id: number
  employee_id: number
  employee_name: string | null
  employee_code: string | null
  period_year: number
  period_month: number
  currency: string
  working_days: number
  paid_days: string
  lop_days: string
  gross: string
  deductions: string
  net_pay: string
  generated_at: string
}

export interface MyPayroll {
  salary: SalaryStructure | null
  payslips: Payslip[]
  ytd_net: string
  currency: string
}

export interface StructureRow {
  employee_id: number
  employee_code: string
  full_name: string
  department: string
  designation: string
  salary: SalaryStructure | null
}

export interface TrendPoint {
  work_date: string
  present: number
  absent: number
  half_day: number
  leave: number
  attendance_rate: number
}

export interface AdminOverview {
  total_employees: number
  active_employees: number
  present_today: number
  on_leave_today: number
  pending_leave_requests: number
  attendance_rate_30d: number
  monthly_payroll_net: string
  currency: string
  headcount_by_department: { department: string; headcount: number }[]
  trend: TrendPoint[]
}

export interface EmployeeInsights {
  attendance_rate_30d: number
  total_hours_30d: number
  avg_daily_hours: number
  punctuality_score: number
  leave_days_taken_ytd: number
  trend: TrendPoint[]
}

export interface Forecast {
  model: string
  trained_on_days: number
  mean_absolute_error: number | null
  points: {
    work_date: string
    predicted_attendance_rate: number
    lower_bound: number
    upper_bound: number
  }[]
  note: string
}

export interface IrregularityFlag {
  employee_id: number
  employee_name: string
  employee_code: string
  department: string
  anomaly_score: number
  absence_rate: number
  avg_late_minutes: number
  leave_days_90d: number
  reason: string
}

export interface AppNotification {
  id: number
  category: string
  title: string
  body: string | null
  link: string | null
  is_read: boolean
  created_at: string
}

export interface LivePresence {
  as_of: string
  sockets_open: number
  currently_working: {
    employee_id: number
    full_name: string
    department: string
    since: string | null
  }[]
}

export interface ActivityEvent {
  id: string
  category: string
  title: string
  description: string | null
  timestamp: string
  badge_tone?: string | null
}

export interface EmployeeActivityRow {
  employee_id: number
  full_name: string
  employee_code: string | null
  email: string
  department: string
  designation: string
  avatar_url: string | null
  work_date: string
  status: AttendanceStatus | null
  check_in: string | null
  check_out: string | null
  worked_minutes: number
  activity_count: number
}

export interface PaginatedActivityHistory extends Paginated<EmployeeActivityRow> {}

export interface ChatMessageCreate {
  recipient_type: string
  recipient_id?: number | null
  target_department?: string | null
  message_type: 'DIRECT' | 'ANNOUNCEMENT'
  content: string
}

export interface ChatMessageOut {
  id: number
  sender_type: string
  sender_id: number
  sender_name: string
  recipient_type: string
  recipient_id?: number | null
  target_department?: string | null
  message_type: 'DIRECT' | 'ANNOUNCEMENT'
  content: string
  is_read: boolean
  read_at?: string | null
  created_at: string
}

export interface ChatChannelOut {
  id: string
  title: string
  subtitle?: string | null
  avatar_url?: string | null
  role: string
  contact_id?: number | null
  contact_type: string
  is_announcement: boolean
  unread_count: number
  last_message?: string | null
  last_message_at?: string | null
}

export interface Holiday {

  id: number
  name: string
  date: string
  day_of_week: string
  type: 'PUBLIC' | 'COMPANY' | 'OPTIONAL'
  description?: string | null
  is_active: boolean
  created_at: string
}




