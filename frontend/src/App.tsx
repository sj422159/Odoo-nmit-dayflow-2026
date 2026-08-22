import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import { RealtimeProvider } from '@/context/RealtimeContext'
import { AppShell } from '@/components/AppShell'
import { RedirectIfSignedIn, RequireAdmin, RequireAuth, RequireCorporate } from '@/components/RouteGuards'
import { Skeleton } from '@/components/ui/Primitives'

const SignIn = lazy(() => import('@/pages/SignIn'))
const CorporateHome = lazy(() => import('@/pages/CorporateHome'))
const SignUp = lazy(() => import('@/pages/SignUp'))
const VerifyEmail = lazy(() => import('@/pages/VerifyEmail'))
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const Profile = lazy(() => import('@/pages/Profile'))
const Attendance = lazy(() => import('@/pages/Attendance'))
const Leave = lazy(() => import('@/pages/Leave'))
const Payroll = lazy(() => import('@/pages/Payroll'))
const AdminEmployees = lazy(() => import('@/pages/admin/Employees'))
const AdminDepartments = lazy(() => import('@/pages/admin/DepartmentCreation'))
const AdminEmployeeDetail = lazy(() => import('@/pages/admin/EmployeeDetail'))
const AdminAttendance = lazy(() => import('@/pages/admin/AttendanceBoard'))
const AdminLeave = lazy(() => import('@/pages/admin/LeaveApprovals'))
const AdminPayroll = lazy(() => import('@/pages/admin/PayrollAdmin'))
const AdminInsights = lazy(() => import('@/pages/admin/Insights'))
const NotFound = lazy(() => import('@/pages/NotFound'))

function PageFallback() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-10 w-56" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((n) => (
          <Skeleton key={n} className="h-28" />
        ))}
      </div>
      <Skeleton className="h-72" />
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <RealtimeProvider>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/signin" element={<RedirectIfSignedIn><SignIn /></RedirectIfSignedIn>} />
            <Route path="/corporate/signin" element={<RedirectIfSignedIn><SignIn corporate /></RedirectIfSignedIn>} />
            <Route path="/signup" element={<RedirectIfSignedIn><SignUp /></RedirectIfSignedIn>} />
            <Route path="/verify" element={<VerifyEmail />} />
            <Route path="/corporate/dashboard" element={<RequireCorporate><CorporateHome /></RequireCorporate>} />

            <Route element={<RequireAuth><AppShell /></RequireAuth>}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/attendance" element={<Attendance />} />
              <Route path="/leave" element={<Leave />} />
              <Route path="/payroll" element={<Payroll />} />

              <Route path="/admin/employees" element={<RequireAdmin><AdminEmployees /></RequireAdmin>} />
              <Route path="/admin/departments" element={<RequireAdmin><AdminDepartments /></RequireAdmin>} />
              <Route path="/admin/employees/:id" element={<RequireAdmin><AdminEmployeeDetail /></RequireAdmin>} />
              <Route path="/admin/attendance" element={<RequireAdmin><AdminAttendance /></RequireAdmin>} />
              <Route path="/admin/leave" element={<RequireAdmin><AdminLeave /></RequireAdmin>} />
              <Route path="/admin/payroll" element={<RequireAdmin><AdminPayroll /></RequireAdmin>} />
              <Route path="/admin/insights" element={<RequireAdmin><AdminInsights /></RequireAdmin>} />

              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </Suspense>
      </RealtimeProvider>
    </AuthProvider>
  )
}
