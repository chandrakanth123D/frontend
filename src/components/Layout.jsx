import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const NAV = {
  PATIENT: [['/patient', 'Overview'], ['/patient/doctors', 'Find a doctor'], ['/patient/appointments', 'My appointments'],
    ['/patient/records', 'Medical records'], ['/patient/prescriptions', 'Prescriptions'], ['/patient/bills', 'Bills and receipts']],
  DOCTOR: [['/doctor', 'My appointments'], ['/doctor/patients', 'Patient history']],
  ADMIN: [['/admin', 'Dashboard'], ['/admin/patients', 'Patients'], ['/admin/doctors', 'Doctors'], ['/admin/appointments', 'Appointments'],
    ['/admin/medicines', 'Medicines'], ['/admin/billing', 'Billing'], ['/admin/reports', 'Reports']],
}

export default function Layout() {
  const { user, signOut } = useAuth()
  const nav = useNavigate()
  return (
    <div className={`shell role-${user.role.toLowerCase()}`}>
      <aside className="side">
        <div className="brand"><span className="mark">+</span> CareLink</div>
        <nav>
          {NAV[user.role].map(([to, label]) => (
            <NavLink key={to} to={to} end={to.split('/').length === 2}>{label}</NavLink>
          ))}
        </nav>
        <div className="me">
          <strong>{user.name}</strong>
          <span>{user.role.toLowerCase()}</span>
          <button className="btn small ghost-light" onClick={() => { signOut(); nav('/login') }}>Sign out</button>
        </div>
      </aside>
      <main className="main"><Outlet /></main>
    </div>
  )
}
