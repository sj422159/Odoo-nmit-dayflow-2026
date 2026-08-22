import { z } from 'zod'

/** Mirrors the Pydantic rules so the user sees problems before the round trip. */
export const PASSWORD_RULES = [
  { label: 'At least 10 characters', test: (v: string) => v.length >= 10 },
  { label: 'An uppercase letter', test: (v: string) => /[A-Z]/.test(v) },
  { label: 'A lowercase letter', test: (v: string) => /[a-z]/.test(v) },
  { label: 'A number', test: (v: string) => /\d/.test(v) },
  { label: 'A symbol', test: (v: string) => /[^A-Za-z0-9]/.test(v) },
]

const password = z
  .string()
  .min(10, 'Use at least 10 characters.')
  .max(128, 'Keep it under 128 characters.')
  .regex(/[A-Z]/, 'Add an uppercase letter.')
  .regex(/[a-z]/, 'Add a lowercase letter.')
  .regex(/\d/, 'Add a number.')
  .regex(/[^A-Za-z0-9]/, 'Add a symbol.')

export const signInSchema = z.object({
  email: z.string().min(1, 'Enter your email.').email('That does not look like an email address.'),
  password: z.string().min(1, 'Enter your password.'),
})

export const signUpSchema = z
  .object({
    employee_code: z
      .string()
      .min(1, 'Enter your employee ID.')
      .transform((v) => v.trim().toUpperCase())
      .pipe(z.string().regex(/^[A-Z]{2,4}-?\d{3,6}$/, 'Employee IDs look like DF-1042.')),
    email: z.string().min(1, 'Enter your work email.').email('That does not look like an email address.'),
    first_name: z
      .string()
      .min(1, 'Enter your first name.')
      .regex(/^[A-Za-z][A-Za-z '-]*$/, 'Letters, spaces, apostrophes and hyphens only.'),
    last_name: z
      .string()
      .min(1, 'Enter your last name.')
      .regex(/^[A-Za-z][A-Za-z '-]*$/, 'Letters, spaces, apostrophes and hyphens only.'),
    department: z.string().max(80).optional(),
    designation: z.string().max(80).optional(),
    role: z.enum(['EMPLOYEE', 'HR', 'CORP_ADMIN']),
    password,
    confirm_password: z.string().min(1, 'Repeat your password.'),
  })
  .refine((data) => data.password === data.confirm_password, {
    path: ['confirm_password'],
    message: 'Both passwords need to match.',
  })

export const profileSchema = z.object({
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9][0-9 -]{6,19}$/, 'Use 7–20 digits, optionally starting with +.')
    .or(z.literal('')),
  address: z.string().max(500, 'Keep the address under 500 characters.').or(z.literal('')),
  avatar_url: z
    .string()
    .trim()
    .regex(/^(https?:\/\/|\/)/, 'Enter a link starting with https:// or /.')
    .or(z.literal('')),
})

export const leaveSchema = z
  .object({
    leave_type: z.enum(['PAID', 'SICK', 'UNPAID']),
    start_date: z.string().min(1, 'Pick a start date.'),
    end_date: z.string().min(1, 'Pick an end date.'),
    remarks: z.string().max(500, 'Keep remarks under 500 characters.').optional(),
  })
  .refine((data) => data.end_date >= data.start_date, {
    path: ['end_date'],
    message: 'The end date cannot be before the start date.',
  })
  .refine(
    (data) => {
      const span =
        (new Date(data.end_date).getTime() - new Date(data.start_date).getTime()) / 86400000 + 1
      return span <= 60
    },
    { path: ['end_date'], message: 'A single request covers at most 60 days.' },
  )

const money = (label: string) =>
  z
    .string()
    .min(1, `Enter ${label}.`)
    .refine((v) => !Number.isNaN(Number(v)) && Number(v) >= 0, 'Use a number of 0 or more.')
    .refine((v) => Number(v) <= 9999999.99, 'That is above the maximum of 9,999,999.99.')

export const salarySchema = z.object({
  currency: z.string().length(3, 'Use a three-letter code, like USD.'),
  basic: money('the basic pay'),
  hra: money('the housing allowance'),
  allowances: money('other allowances'),
  deductions: money('deductions'),
  effective_from: z.string().min(1, 'Pick the date this takes effect.'),
})

export const adminEmployeeSchema = z.object({
  first_name: z.string().min(1, 'Enter a first name.'),
  last_name: z.string().min(1, 'Enter a last name.'),
  department: z.string().min(2, 'Enter a department.'),
  designation: z.string().min(2, 'Enter a job title.'),
  employment_type: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN']),
  date_of_joining: z.string().min(1, 'Pick a joining date.'),
  role: z.enum(['EMPLOYEE', 'HR', 'CORP_ADMIN']),
  is_active: z.boolean(),
  phone: z.string().or(z.literal('')),
  address: z.string().or(z.literal('')),
})

export type SignInValues = z.infer<typeof signInSchema>
export type SignUpValues = z.infer<typeof signUpSchema>
export type ProfileValues = z.infer<typeof profileSchema>
export type LeaveValues = z.infer<typeof leaveSchema>
export type SalaryValues = z.infer<typeof salarySchema>
export type AdminEmployeeValues = z.infer<typeof adminEmployeeSchema>
