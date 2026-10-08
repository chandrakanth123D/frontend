import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import api, { errMsg } from '../api'
import { Badge, Empty, Field, Loading, PageHead, fmtDate, fmtTime, today, useToast } from '../components/ui'
import { PrescriptionList, RecordList } from './PatientPages'

/* ------------------------------------------------ Appointment list */
export function Appointments() {
  const [appts, setAppts] = useState(null)
  const [tab, setTab] = useState('today')
  const toast = useToast()
  const load = () => api.get('/appointments').then((r) => setAppts(r.data)).catch((e) => toast(errMsg(e), 'error'))
  useEffect(() => { load() }, [])

  const cancel = async (a) => {
    if (!window.confirm('Cancel this appointment?')) return
    try { await api.put(`/appointments/${a.id}/cancel`); toast('Appointment cancelled'); load() } catch (e) { toast(errMsg(e), 'error') }
  }
  if (!appts) return <Loading />

  const t = today()
  const groups = {
    today: appts.filter((a) => a.date === t && a.status === 'BOOKED'),
    upcoming: appts.filter((a) => a.date > t && a.status === 'BOOKED'),
    past: appts.filter((a) => a.status !== 'BOOKED' || a.date < t).reverse(),
  }
  const list = groups[tab]

  return (
    <>
      <PageHead title="My appointments" sub="Open a booked appointment to see the patient's history and start the consultation." />
      <div className="tabs line">
        {[['today', 'Today'], ['upcoming', 'Upcoming'], ['past', 'Past']].map(([k, l]) =>
          <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l} <span className="count">{groups[k].length}</span></button>)}
      </div>
      {list.length === 0 ? <Empty text={tab === 'today' ? 'No appointments left today.' : `No ${tab} appointments.`} /> : (
        <div className="table-wrap"><table>
          <thead><tr><th>Date</th><th>Time</th><th>Patient</th><th>Reason</th><th>Type</th><th>Status</th><th /></tr></thead>
          <tbody>{list.map((a) => (
            <tr key={a.id}>
              <td>{fmtDate(a.date)}</td><td>{fmtTime(a.time)}</td>
              <td>{a.patient.user.name}<small className="sub">{a.patient.age ? `${a.patient.age} yrs` : ''} {a.patient.gender || ''}</small></td>
              <td>{a.reason || '—'}</td><td>{a.mode === 'ONLINE' ? 'Online' : 'In person'}</td><td><Badge value={a.status} /></td>
              <td className="row-actions">{a.status === 'BOOKED' && <>
                <Link className="btn small" to={`/doctor/consult/${a.id}`}>Start consultation</Link>
                <button className="btn small danger" onClick={() => cancel(a)}>Cancel</button></>}</td>
            </tr>))}</tbody>
        </table></div>
      )}
    </>
  )
}

/* ------------------------------------------------ Patient history browser */
export function Patients() {
  const [appts, setAppts] = useState(null)
  const [sel, setSel] = useState(null)
  useEffect(() => { api.get('/appointments').then((r) => setAppts(r.data)) }, [])
  const patients = useMemo(() => {
    const m = new Map()
    ;(appts || []).forEach((a) => m.set(a.patient.id, a.patient))
    return [...m.values()]
  }, [appts])
  if (!appts) return <Loading />
  return (
    <>
      <PageHead title="Patient history" sub="Patients you have an appointment with." />
      {patients.length === 0 ? <Empty text="You have no patients yet." /> : (
        <div className="split">
          <div className="stack">{patients.map((p) => (
            <button key={p.id} className={`panel pick ${sel?.id === p.id ? 'on' : ''}`} onClick={() => setSel(p)}>
              <strong>{p.user.name}</strong><span className="muted">{p.age ? `${p.age} yrs · ` : ''}{p.gender || ''} {p.bloodGroup ? `· ${p.bloodGroup}` : ''}</span>
            </button>))}</div>
          <div>{sel ? <History patient={sel} /> : <Empty text="Select a patient to see their records." />}</div>
        </div>
      )}
    </>
  )
}

function History({ patient }) {
  const [records, setRecords] = useState(null)
  const [pres, setPres] = useState(null)
  useEffect(() => {
    setRecords(null); setPres(null)
    api.get(`/records/patient/${patient.id}`).then((r) => setRecords(r.data))
    api.get(`/prescriptions/patient/${patient.id}`).then((r) => setPres(r.data))
  }, [patient.id])
  return (
    <div className="stack">
      <h2>{patient.user.name}</h2>
      <p className="muted">{patient.phone || ''} {patient.address ? `· ${patient.address}` : ''}</p>
      <h3>Medical records</h3>{records ? <RecordList records={records} /> : <Loading />}
      <h3>Prescriptions</h3>{pres ? <PrescriptionList list={pres} /> : <Loading />}
    </div>
  )
}

/* ------------------------------------------------ Consultation */
export function Consultation() {
  const { id } = useParams()
  const nav = useNavigate()
  const toast = useToast()
  const [appt, setAppt] = useState(null)
  const [medicines, setMedicines] = useState([])
  const [form, setForm] = useState({ diagnosis: '', notes: '', followUp: '' })
  const [items, setItems] = useState([{ medicine: '', dosage: '', duration: '' }])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api.get(`/appointments/${id}`).then((r) => setAppt(r.data)).catch((e) => toast(errMsg(e), 'error'))
    api.get('/medicines').then((r) => setMedicines(r.data)).catch(() => {})
  }, [id])

  if (!appt) return <Loading />
  const setItem = (i, k, v) => setItems(items.map((it, n) => (n === i ? { ...it, [k]: v } : it)))

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      await api.post('/consultations', { appointmentId: appt.id, ...form, items })
      toast('Consultation saved. The appointment is completed and the bill is raised.')
      nav('/doctor')
    } catch (err) { toast(errMsg(err), 'error'); setBusy(false) }
  }

  return (
    <>
      <PageHead title={`Consultation: ${appt.patient.user.name}`} sub={`${fmtDate(appt.date)}, ${fmtTime(appt.time)} · ${appt.reason || 'No reason given'}`}>
        <Link className="btn ghost" to="/doctor">Back to appointments</Link>
      </PageHead>
      <div className="split wide-left">
        <form className="panel form" onSubmit={submit}>
          <h3>Diagnosis and treatment</h3>
          <Field label="Diagnosis"><input value={form.diagnosis} onChange={(e) => setForm({ ...form, diagnosis: e.target.value })} required /></Field>
          <Field label="Notes"><textarea rows="4" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
          <Field label="Follow-up"><input value={form.followUp} onChange={(e) => setForm({ ...form, followUp: e.target.value })} placeholder="e.g. Review after 2 weeks" /></Field>

          <h3>Prescription</h3>
          <datalist id="meds">{medicines.map((m) => <option key={m.id} value={m.name} />)}</datalist>
          {items.map((it, i) => (
            <div className="rx-row" key={i}>
              <input list="meds" placeholder="Medicine" value={it.medicine} onChange={(e) => setItem(i, 'medicine', e.target.value)} />
              <input placeholder="Dosage (1-0-1)" value={it.dosage} onChange={(e) => setItem(i, 'dosage', e.target.value)} />
              <input placeholder="Duration" value={it.duration} onChange={(e) => setItem(i, 'duration', e.target.value)} />
              <button type="button" className="icon-btn" aria-label="Remove medicine" onClick={() => setItems(items.filter((_, n) => n !== i))}>×</button>
            </div>
          ))}
          <button type="button" className="btn small ghost" onClick={() => setItems([...items, { medicine: '', dosage: '', duration: '' }])}>Add medicine</button>

          <div className="form-actions"><button className="btn" disabled={busy}>{busy ? 'Saving…' : 'Save and complete consultation'}</button></div>
        </form>
        <aside><History patient={appt.patient} /></aside>
      </div>
    </>
  )
}
