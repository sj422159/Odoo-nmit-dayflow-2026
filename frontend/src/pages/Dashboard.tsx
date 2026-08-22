import { useAuth } from '@/context/AuthContext'
import EmployeeHome from '@/pages/home/EmployeeHome'
import AdminHome from '@/pages/home/AdminHome'

/** One route, two very different jobs — split by role. */
export default function Dashboard() {
  const { isAdmin } = useAuth()
  return isAdmin ? <AdminHome /> : <EmployeeHome />
}
