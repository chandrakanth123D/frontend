import { useEffect, useState } from 'react'
import api, { errMsg } from '../api'
import CrudPage from '../components/CrudPage'
import RescheduleModal from '../components/RescheduleModal'
import { Badge, Empty, Field, Loading, Modal, PageHead, fmtDate, fmtTime, money, useToast } from '../components/ui'

function useGet(url) {
  const [data, setData] = useState(null)
  const toast = useToast()
  const load = () => api.get(url).then((r) => setData(r.data)).catch((e) => toast(errMsg(e), 'error'))
  useEffect(() => { load() }, [url])
  return [data, load]
}

/* ------------------------------------------------ Dashboard */
export function Dashboard() {
  const [s] = useGet('/admin/stats')
  const [appts] = useGet('/appointments')
  if (!s || !appts) return <Loading />
  const cards = [
    ['Patients', s.patients], ['Doctors', s.doctors], ['Appointments today', s.todayAppointments],
    ['All appointments', s.appointments], ['Revenue collected', money(s.revenue)], ['Unpaid bills', s.pendingBills],
    ['Medicines low on stock', s.lowStock], ['Medicines expiring in 3 months', s.expiringSoon],
  ]
  return (
    <>
      <PageHead title="Hospital overview" sub="Live numbers from the system." />
      <div className="stats">{cards.map(([l, v]) => <div className="panel stat" key={l}><span className="big">{v}</span><span className="muted">{l}</span></div>)}</div>
      <h2>Latest appointments</h2>
      {appts.length === 0 ? <Empty text="No appointments yet." /> : (
        <div className="table-wrap"><table>
          <thead><tr><th>Date</th><th>Time</th><th>Patient</th><th>Doctor</th><th>Status</th></tr></thead>
          <tbody>{appts.slice(0, 6).map((a) => <tr key={a.id}><td>{fmtDate(a.date)}</td><td>{fmtTime(a.time)}</td><td>{a.patient.user.name}</td><td>{a.doctor.user.name}</td><td><Badge value={a.status} /></td></tr>)}</tbody>
        </table></div>
      )}
    </>
  )
}

/* ------------------------------------------------ Patients */
export const Patients = () => (
  <CrudPage title="Patients" sub="Add, edit and view patient accounts." noun="Patient" endpoint="/patients"
    blank={{ name: '', email: '', password: '', age: '', gender: '', phone: '', bloodGroup: '', address: '' }}
    toForm={(p) => ({ name: p.user.name, email: p.user.email, password: '', age: p.age ?? '', gender: p.gender ?? '', phone: p.phone ?? '', bloodGroup: p.bloodGroup ?? '', address: p.address ?? '' })}
    columns={[
      { label: 'Name', render: (p) => <>{p.user.name}<small className="sub">{p.user.email}</small></> },
      { label: 'Age', render: (p) => p.age ?? '—' }, { label: 'Gender', render: (p) => p.gender || '—' },
      { label: 'Phone', render: (p) => p.phone || '—' }, { label: 'Blood', render: (p) => p.bloodGroup || '—' },
    ]}
    fields={[
      { name: 'name', label: 'Full name', required: true }, { name: 'email', label: 'Email', type: 'email', required: true },
      { name: 'password', label: 'Password', type: 'password' }, { name: 'age', label: 'Age', type: 'number' },
      { name: 'gender', label: 'Gender', type: 'select', options: ['Female', 'Male', 'Other'] }, { name: 'phone', label: 'Phone' },
      { name: 'bloodGroup', label: 'Blood group' }, { name: 'address', label: 'Address' },
    ]} />
)

/* ------------------------------------------------ Doctors */
export const Doctors = () => (
  <CrudPage title="Doctors" sub="Doctors sign in with the email and password you set here." noun="Doctor" endpoint="/doctors"
    blank={{ name: '', email: '', password: '', specialization: '', qualification: '', phone: '', availability: '', fee: '' }}
    toForm={(d) => ({ name: d.user.name, email: d.user.email, password: '', specialization: d.specialization, qualification: d.qualification ?? '', phone: d.phone ?? '', availability: d.availability ?? '', fee: d.fee ?? '' })}
    columns={[
      { label: 'Name', render: (d) => <>{d.user.name}<small className="sub">{d.user.email}</small></> },
      { label: 'Specialization', render: (d) => d.specialization }, { label: 'Qualification', render: (d) => d.qualification || '—' },
      { label: 'Availability', render: (d) => d.availability || '—' }, { label: 'Fee', render: (d) => money(d.fee) },
    ]}
    fields={[
      { name: 'name', label: 'Full name', required: true }, { name: 'email', label: 'Email', type: 'email', required: true },
      { name: 'password', label: 'Password', type: 'password' }, { name: 'specialization', label: 'Specialization', required: true },
      { name: 'qualification', label: 'Qualification' }, { name: 'phone', label: 'Phone' },
      { name: 'availability', label: 'Availability' }, { name: 'fee', label: 'Consultation fee (₹)', type: 'number' },
    ]} />
)

/* ------------------------------------------------ Appointments */
export function Appointments() {
  const [appts, load] = useGet('/appointments')
  const [resched, setResched] = useState(null)
  const [status, setStatus] = useState('')
  const toast = useToast()
  const cancel = async (a) => {
    if (!window.confirm('Cancel this appointment?')) return
    try { await api.put(`/appointments/${a.id}/cancel`); toast('Appointment cancelled'); load() } catch (e) { toast(errMsg(e), 'error') }
  }
  if (!appts) return <Loading />
  const shown = appts.filter((a) => !status || a.status === status)
  return (
    <>
      <PageHead title="Appointments" sub="View, reschedule or cancel any booking.">
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
          <option value="">All statuses</option><option>BOOKED</option><option>COMPLETED</option><option>CANCELLED</option>
        </select>
      </PageHead>
      {shown.length === 0 ? <Empty text="No appointments to show." /> : (
        <div className="table-wrap"><table>
          <thead><tr><th>Date</th><th>Time</th><th>Patient</th><th>Doctor</th><th>Type</th><th>Status</th><th /></tr></thead>
          <tbody>{shown.map((a) => (
            <tr key={a.id}><td>{fmtDate(a.date)}</td><td>{fmtTime(a.time)}</td><td>{a.patient.user.name}</td>
              <td>{a.doctor.user.name}<small className="sub">{a.doctor.specialization}</small></td>
              <td>{a.mode === 'ONLINE' ? 'Online' : 'In person'}</td><td><Badge value={a.status} /></td>
              <td className="row-actions">{a.status === 'BOOKED' && <>
                <button className="btn small ghost" onClick={() => setResched(a)}>Reschedule</button>
                <button className="btn small danger" onClick={() => cancel(a)}>Cancel</button></>}</td></tr>))}</tbody>
        </table></div>
      )}
      {resched && <RescheduleModal appt={resched} onClose={() => setResched(null)} onDone={() => { setResched(null); load() }} />}
    </>
  )
}

/* ------------------------------------------------ Medicines */
function Restock({ med, onDone }) {
  const toast = useToast()
  const add = async () => {
    const qty = Number(window.prompt(`Units purchased for ${med.name}?`, '50'))
    if (!qty || qty < 1) return
    try { await api.put(`/medicines/${med.id}/purchase`, { quantity: qty }); toast(`Added ${qty} units`); onDone() } catch (e) { toast(errMsg(e), 'error') }
  }
  return <button className="btn small ghost" onClick={add}>Restock</button>
}

export const Medicines = () => {
  const soon = new Date(); soon.setMonth(soon.getMonth() + 3)
  const flag = (m) => m.stock < 20 || (m.expiryDate && new Date(m.expiryDate) < soon)
  return (
    <CrudPage title="Medicines" sub="Stock, expiry and purchases. Rows needing attention are highlighted." noun="Medicine" endpoint="/medicines"
      blank={{ name: '', category: '', stock: '', price: '', expiryDate: '' }}
      toForm={(m) => ({ name: m.name, category: m.category ?? '', stock: m.stock ?? '', price: m.price ?? '', expiryDate: m.expiryDate ?? '' })}
      rowClass={(m) => (flag(m) ? 'warn' : '')}
      rowActions={(m, reload) => <Restock med={m} onDone={reload} />}
      columns={[
        { label: 'Medicine', render: (m) => m.name }, { label: 'Category', render: (m) => m.category || '—' },
        { label: 'In stock', render: (m) => <>{m.stock}{m.stock < 20 && <small className="sub bad">Low stock</small>}</> },
        { label: 'Price', render: (m) => money(m.price) },
        { label: 'Expiry', render: (m) => <>{fmtDate(m.expiryDate)}{m.expiryDate && new Date(m.expiryDate) < soon && <small className="sub bad">Expires soon</small>}</> },
      ]}
      fields={[
        { name: 'name', label: 'Name', required: true }, { name: 'category', label: 'Category' },
        { name: 'stock', label: 'Stock (units)', type: 'number', required: true }, { name: 'price', label: 'Price per unit (₹)', type: 'number', required: true },
        { name: 'expiryDate', label: 'Expiry date', type: 'date' },
      ]} />
  )
}

/* ------------------------------------------------ Billing */
export function Billing() {
  const [bills, load] = useGet('/bills')
  const [patients] = useGet('/patients')
  const [show, setShow] = useState(false)
  const [f, setF] = useState({ patientId: '', description: '', amount: '' })
  const toast = useToast()

  const create = async (e) => {
    e.preventDefault()
    try { await api.post('/bills', { patientId: Number(f.patientId), description: f.description, amount: Number(f.amount) }); toast('Bill generated'); setShow(false); setF({ patientId: '', description: '', amount: '' }); load() }
    catch (err) { toast(errMsg(err), 'error') }
  }
  const markPaid = async (b, mode) => {
    try { await api.put(`/bills/${b.id}/pay`, { paymentMode: mode }); toast('Payment recorded'); load() } catch (e) { toast(errMsg(e), 'error') }
  }
  if (!bills) return <Loading />
  return (
    <>
      <PageHead title="Billing" sub="Consultation bills are raised automatically. Add other charges here.">
        <button className="btn" onClick={() => setShow(true)}>Generate bill</button>
      </PageHead>
      {bills.length === 0 ? <Empty text="No bills yet." /> : (
        <div className="table-wrap"><table>
          <thead><tr><th>Bill</th><th>Date</th><th>Patient</th><th>Description</th><th>Amount</th><th>Status</th><th /></tr></thead>
          <tbody>{bills.map((b) => (
            <tr key={b.id}><td>#{b.id}</td><td>{fmtDate(b.billDate)}</td><td>{b.patient.user.name}</td><td>{b.description}</td><td>{money(b.amount)}</td>
              <td><Badge value={b.status} />{b.paymentMode && <small className="sub">{b.paymentMode.toLowerCase()} · {b.receiptNo}</small>}</td>
              <td className="row-actions">{b.status === 'PENDING' && <>
                <button className="btn small ghost" onClick={() => markPaid(b, 'CASH')}>Paid in cash</button>
                <button className="btn small ghost" onClick={() => markPaid(b, 'ONLINE')}>Paid online</button></>}</td></tr>))}</tbody>
        </table></div>
      )}
      {show && (
        <Modal title="Generate bill" onClose={() => setShow(false)}>
          <form className="form" onSubmit={create}>
            <Field label="Patient">
              <select value={f.patientId} onChange={(e) => setF({ ...f, patientId: e.target.value })} required>
                <option value="">Select patient…</option>{(patients || []).map((p) => <option key={p.id} value={p.id}>{p.user.name}</option>)}
              </select>
            </Field>
            <Field label="Description"><input value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="e.g. Lab tests, room charges" /></Field>
            <Field label="Amount (₹)"><input type="number" min="1" step="any" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} required /></Field>
            <div className="form-actions"><button type="button" className="btn ghost" onClick={() => setShow(false)}>Cancel</button><button className="btn">Generate bill</button></div>
          </form>
        </Modal>
      )}
    </>
  )
}

/* ------------------------------------------------ Reports */
function Bars({ title, data, money: isMoney }) {
  const entries = Object.entries(data || {})
  const max = Math.max(1, ...entries.map(([, v]) => v))
  return (
    <section className="panel">
      <h3>{title}</h3>
      {entries.length === 0 ? <p className="muted">No data yet.</p> : entries.map(([k, v]) => (
        <div className="bar-row" key={k}>
          <span className="bar-label">{k}</span>
          <span className="bar"><i style={{ width: `${(v / max) * 100}%` }} /></span>
          <b>{isMoney ? money(v) : v}</b>
        </div>
      ))}
    </section>
  )
}

export function Reports() {
  const [r] = useGet('/admin/reports')
  if (!r) return <Loading />
  return (
    <>
      <PageHead title="Reports" sub="Patients, appointments and revenue at a glance.">
        <button className="btn ghost" onClick={() => window.print()}>Print report</button>
      </PageHead>
      <div className="grid-cards">
        <Bars title="Appointments by status" data={r.appointmentsByStatus} />
        <Bars title="Appointments by doctor" data={r.appointmentsByDoctor} />
        <Bars title="Patients by gender" data={r.patientsByGender} />
        <Bars title="Revenue by month" data={r.revenueByMonth} money />
      </div>
      <h2>Medicines to reorder</h2>
      {r.lowStock.length === 0 ? <Empty text="Every medicine is well stocked." /> : (
        <div className="table-wrap"><table><thead><tr><th>Medicine</th><th>In stock</th><th>Expiry</th></tr></thead>
          <tbody>{r.lowStock.map((m) => <tr key={m.id}><td>{m.name}</td><td>{m.stock}</td><td>{fmtDate(m.expiryDate)}</td></tr>)}</tbody></table></div>
      )}
    </>
  )
}
