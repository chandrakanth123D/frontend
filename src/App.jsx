import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth, homeFor } from './context/AuthContext'
import Layout from './components/Layout'
import Auth from './pages/Auth'
import * as P from './pages/PatientPages'
import * as D from './pages/DoctorPages'
import * as A from './pages/AdminPages'

function Guard({ role, children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== role) return <Navigate to={homeFor(user.role)} replace />
  return children
}

export default function App() {
  const { user } = useAuth()
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={homeFor(user.role)} replace /> : <Auth />} />

      <Route path="/patient" element={<Guard role="PATIENT"><Layout /></Guard>}>
        <Route index element={<P.Overview />} />
        <Route path="doctors" element={<P.FindDoctors />} />
        <Route path="appointments" element={<P.MyAppointments />} />
        <Route path="records" element={<P.MyRecords />} />
        <Route path="prescriptions" element={<P.MyPrescriptions />} />
        <Route path="bills" element={<P.MyBills />} />
      </Route>

      <Route path="/doctor" element={<Guard role="DOCTOR"><Layout /></Guard>}>
        <Route index element={<D.Appointments />} />
        <Route path="patients" element={<D.Patients />} />
        <Route path="consult/:id" element={<D.Consultation />} />
      </Route>

      <Route path="/admin" element={<Guard role="ADMIN"><Layout /></Guard>}>
        <Route index element={<A.Dashboard />} />
        <Route path="patients" element={<A.Patients />} />
        <Route path="doctors" element={<A.Doctors />} />
        <Route path="appointments" element={<A.Appointments />} />
        <Route path="medicines" element={<A.Medicines />} />
        <Route path="billing" element={<A.Billing />} />
        <Route path="reports" element={<A.Reports />} />
      </Route>

      <Route path="*" element={<Navigate to={user ? homeFor(user.role) : '/login'} replace />} />
    </Routes>
  )
}
