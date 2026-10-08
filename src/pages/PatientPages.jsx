import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import api, { errMsg } from '../api'
import { useAuth } from '../context/AuthContext'
import { Badge, Empty, Field, Loading, Modal, PageHead, fmtDate, fmtTime, money, printDoc, today, useToast } from '../components/ui'
import SlotPicker from '../components/SlotPicker'
import RescheduleModal from '../components/RescheduleModal'

function useGet(url) {
  const [data, setData] = useState(null)
  const toast = useToast()
  const load = () => api.get(url).then((r) => setData(r.data)).catch((e) => toast(errMsg(e), 'error'))
  useEffect(() => { load() }, [url])
  return [data, load]
}

/* ------------------------------------------------ Overview */
export function Overview() {
  const { user } = useAuth()
  const [appts] = useGet('/appointments')
  const [bills] = useGet('/bills/my')
  if (!appts || !bills) return <Loading />
  const now = new Date()
  const upcoming = appts.filter((a) => a.status === 'BOOKED' && new Date(`${a.date}T${a.time}`) >= now).reverse()
  const due = bills.filter((b) => b.status === 'PENDING')
  const next = upcoming[0]
  return (
    <>
      <PageHead title={`Hello, ${user.name.split(' ')[0]}`} sub="Here is where your care stands today." />
      <div className="grid-cards">
        <div className="panel feature">
          <h3>Next appointment</h3>
          {next ? (
            <>
              <p className="big">{fmtDate(next.date)}, {fmtTime(next.time)}</p>
              <p>{next.doctor.user.name} · {next.doctor.specialization}</p>
              <p className="muted">{next.mode === 'ONLINE' ? 'Online consultation' : 'In person'}{next.reason ? ` · ${next.reason}` : ''}</p>
            </>
          ) : <Empty text="Nothing booked yet."><Link className="btn" to="/patient/doctors">Find a doctor</Link></Empty>}
        </div>
        <div className="panel">
          <h3>Bills to pay</h3>
          <p className="big">{due.length ? money(due.reduce((s, b) => s + b.amount, 0)) : 'All clear'}</p>
          <p className="muted">{due.length ? `${due.length} unpaid bill${due.length > 1 ? 's' : ''}` : 'You have no unpaid bills.'}</p>
          {due.length > 0 && <Link className="btn small" to="/patient/bills">Pay now</Link>}
        </div>
        <div className="panel">
          <h3>Visits so far</h3>
          <p className="big">{appts.filter((a) => a.status === 'COMPLETED').length}</p>
          <p className="muted">{upcoming.length} upcoming</p>
          <Link className="btn small ghost" to="/patient/records">View records</Link>
        </div>
      </div>
    </>
  )
}

/* ------------------------------------------------ Find doctor + book */
export function FindDoctors() {
  const [doctors] = useGet('/doctors')
  const [q, setQ] = useState('')
  const [spec, setSpec] = useState('')
  const [booking, setBooking] = useState(null)
  const [confirmed, setConfirmed] = useState(null)

  const specs = useMemo(() => [...new Set((doctors || []).map((d) => d.specialization))].sort(), [doctors])
  if (!doctors) return <Loading />
  const shown = doctors.filter((d) =>
    (!spec || d.specialization === spec) && (d.user.name + d.specialization).toLowerCase().includes(q.toLowerCase()))

  return (
    <>
      <PageHead title="Find a doctor" sub="Search by name or specialization, then pick a time.">
        <input className="search" placeholder="Search doctors" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={spec} onChange={(e) => setSpec(e.target.value)} aria-label="Specialization">
          <option value="">All specializations</option>{specs.map((s) => <option key={s}>{s}</option>)}
        </select>
      </PageHead>
      {shown.length === 0 ? <Empty text="No doctors match your search." /> : (
        <div className="grid-cards">
          {shown.map((d) => (
            <div className="panel doctor" key={d.id}>
              <div className="avatar">{d.user.name.replace('Dr. ', '')[0]}</div>
              <h3>{d.user.name}</h3>
              <p className="spec">{d.specialization}</p>
              <p className="muted">{d.qualification}</p>
              <p className="muted">Available {d.availability || 'on request'}</p>
              <div className="doctor-foot">
                <strong>{money(d.fee)}</strong>
                <button className="btn small" onClick={() => setBooking(d)}>Book appointment</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {booking && <BookModal doctor={booking} onClose={() => setBooking(null)} onBooked={(a) => { setBooking(null); setConfirmed(a) }} />}
      {confirmed && (
        <Modal title="Appointment confirmed" onClose={() => setConfirmed(null)}>
          <div className="confirm">
            <p className="big">{fmtDate(confirmed.date)}, {fmtTime(confirmed.time)}</p>
            <p>{confirmed.doctor.user.name} · {confirmed.doctor.specialization}</p>
            <p className="muted">{confirmed.mode === 'ONLINE' ? 'Online consultation' : 'In person at the hospital'} · Booking #{confirmed.id}</p>
            <div className="form-actions">
              <Link className="btn" to="/patient/appointments">View my appointments</Link>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}

function BookModal({ doctor, onClose, onBooked }) {
  const [date, setDate] = useState(today())
  const [time, setTime] = useState('')
  const [reason, setReason] = useState('')
  const [mode, setMode] = useState('IN_PERSON')
  const toast = useToast()
  const submit = async (e) => {
    e.preventDefault()
    if (!time) return toast('Pick a time slot', 'error')
    try {
      const { data } = await api.post('/appointments', { doctorId: doctor.id, date, time, reason, mode })
      onBooked(data)
    } catch (err) { toast(errMsg(err), 'error') }
  }
  return (
    <Modal title={`Book ${doctor.user.name}`} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <SlotPicker doctorId={doctor.id} date={date} time={time} onChange={(d, t) => { setDate(d); setTime(t) }} />
        <Field label="Visit type">
          <select value={mode} onChange={(e) => setMode(e.target.value)}><option value="IN_PERSON">In person</option><option value="ONLINE">Online</option></select>
        </Field>
        <Field label="Reason for visit"><textarea rows="2" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Briefly describe your symptoms" /></Field>
        <div className="form-actions">
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn">Confirm booking · {money(doctor.fee)}</button>
        </div>
      </form>
    </Modal>
  )
}

/* ------------------------------------------------ Appointments */
export function MyAppointments() {
  const [appts, load] = useGet('/appointments')
  const [resched, setResched] = useState(null)
  const toast = useToast()
  const cancel = async (a) => {
    if (!window.confirm('Cancel this appointment?')) return
    try { await api.put(`/appointments/${a.id}/cancel`); toast('Appointment cancelled'); load() } catch (e) { toast(errMsg(e), 'error') }
  }
  if (!appts) return <Loading />
  return (
    <>
      <PageHead title="My appointments"><Link className="btn" to="/patient/doctors">Book new</Link></PageHead>
      {appts.length === 0 ? <Empty text="You have not booked any appointments yet."><Link className="btn" to="/patient/doctors">Find a doctor</Link></Empty> : (
        <div className="table-wrap"><table>
          <thead><tr><th>Date</th><th>Time</th><th>Doctor</th><th>Type</th><th>Status</th><th /></tr></thead>
          <tbody>{appts.map((a) => (
            <tr key={a.id}>
              <td>{fmtDate(a.date)}</td><td>{fmtTime(a.time)}</td>
              <td>{a.doctor.user.name}<small className="sub">{a.doctor.specialization}</small></td>
              <td>{a.mode === 'ONLINE' ? 'Online' : 'In person'}</td><td><Badge value={a.status} /></td>
              <td className="row-actions">{a.status === 'BOOKED' && <>
                <button className="btn small ghost" onClick={() => setResched(a)}>Reschedule</button>
                <button className="btn small danger" onClick={() => cancel(a)}>Cancel</button></>}</td>
            </tr>))}</tbody>
        </table></div>
      )}
      {resched && <RescheduleModal appt={resched} onClose={() => setResched(null)} onDone={() => { setResched(null); load() }} />}
    </>
  )
}

/* ------------------------------------------------ Records */
export const RecordList = ({ records }) => records.length === 0 ? <Empty text="No medical records yet. They appear after a consultation." /> : (
  <div className="stack">{records.map((r) => (
    <article className="panel" key={r.id}>
      <header className="row-between"><h3>{r.diagnosis}</h3><span className="muted">{fmtDate(r.date)}</span></header>
      <p className="muted">{r.doctor.user.name} · {r.doctor.specialization}</p>
      {r.notes && <p>{r.notes}</p>}
      {r.followUp && <p><strong>Follow-up:</strong> {r.followUp}</p>}
    </article>))}
  </div>
)

export function MyRecords() {
  const [records] = useGet('/records/my')
  if (!records) return <Loading />
  return <><PageHead title="Medical records" sub="Diagnoses and notes from your doctors." /><RecordList records={records} /></>
}

/* ------------------------------------------------ Prescriptions */
export const printPrescription = (p) => printDoc('Prescription', `
  <p><b>Patient:</b> ${p.patient.user.name} &nbsp; <b>Date:</b> ${fmtDate(p.date)}</p>
  <p><b>Doctor:</b> ${p.doctor.user.name} (${p.doctor.specialization})</p>
  <h2>Medicines</h2><table><tr><th>Medicine</th><th>Dosage</th><th>Duration</th></tr>
  ${p.items.map((i) => `<tr><td>${i.medicine}</td><td>${i.dosage || ''}</td><td>${i.duration || ''}</td></tr>`).join('')}</table>`)

export const PrescriptionList = ({ list, canPrint }) => list.length === 0 ? <Empty text="No prescriptions yet." /> : (
  <div className="stack">{list.map((p) => (
    <article className="panel" key={p.id}>
      <header className="row-between">
        <h3>{p.doctor.user.name}</h3>
        <span className="muted">{fmtDate(p.date)}</span>
      </header>
      <table className="plain"><thead><tr><th>Medicine</th><th>Dosage</th><th>Duration</th></tr></thead>
        <tbody>{p.items.map((i, n) => <tr key={n}><td>{i.medicine}</td><td>{i.dosage}</td><td>{i.duration}</td></tr>)}</tbody></table>
      {canPrint && <button className="btn small ghost" onClick={() => printPrescription(p)}>Download / print</button>}
    </article>))}
  </div>
)

export function MyPrescriptions() {
  const [list] = useGet('/prescriptions/my')
  if (!list) return <Loading />
  return <><PageHead title="Prescriptions" sub="Open one to print or save it as a PDF." /><PrescriptionList list={list} canPrint /></>
}

/* ------------------------------------------------ Bills */
export const printReceipt = (b) => printDoc(`Payment receipt ${b.receiptNo}`, `
  <p><b>Patient:</b> ${b.patient.user.name}</p><p><b>Paid on:</b> ${fmtDate(b.paidDate)} &nbsp; <b>Mode:</b> ${b.paymentMode}</p>
  <table><tr><th>Description</th><th>Amount</th></tr><tr><td>${b.description}</td><td>${money(b.amount)}</td></tr></table>
  <p class="total">Total paid: ${money(b.amount)}</p><p class="muted">Receipt no. ${b.receiptNo}. Thank you.</p>`)

export function MyBills() {
  const [bills, load] = useGet('/bills/my')
  const [paying, setPaying] = useState(null)
  const [mode, setMode] = useState('ONLINE')
  const toast = useToast()
  const pay = async () => {
    try { const { data } = await api.put(`/bills/${paying.id}/pay`, { paymentMode: mode }); setPaying(null); toast('Payment recorded'); load(); printReceipt(data) }
    catch (e) { toast(errMsg(e), 'error') }
  }
  if (!bills) return <Loading />
  return (
    <>
      <PageHead title="Bills and receipts" />
      {bills.length === 0 ? <Empty text="No bills yet. A bill is raised after each completed consultation." /> : (
        <div className="table-wrap"><table>
          <thead><tr><th>Date</th><th>Description</th><th>Amount</th><th>Status</th><th /></tr></thead>
          <tbody>{bills.map((b) => (
            <tr key={b.id}><td>{fmtDate(b.billDate)}</td><td>{b.description}</td><td>{money(b.amount)}</td><td><Badge value={b.status} /></td>
              <td className="row-actions">{b.status === 'PENDING'
                ? <button className="btn small" onClick={() => setPaying(b)}>Pay bill</button>
                : <button className="btn small ghost" onClick={() => printReceipt(b)}>Receipt</button>}</td></tr>))}</tbody>
        </table></div>
      )}
      {paying && (
        <Modal title="Pay bill" onClose={() => setPaying(null)}>
          <div className="form">
            <p className="big">{money(paying.amount)}</p><p className="muted">{paying.description}</p>
            <Field label="Payment method">
              <select value={mode} onChange={(e) => setMode(e.target.value)}><option value="ONLINE">Online (card / UPI)</option><option value="CASH">Cash at the counter</option></select>
            </Field>
            <p className="muted">This demo records the payment without contacting a payment gateway.</p>
            <div className="form-actions"><button className="btn ghost" onClick={() => setPaying(null)}>Cancel</button><button className="btn" onClick={pay}>Pay {money(paying.amount)}</button></div>
          </div>
        </Modal>
      )}
    </>
  )
}
