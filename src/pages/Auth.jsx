import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api, { errMsg } from '../api'
import { useAuth, homeFor } from '../context/AuthContext'
import { Field } from '../components/ui'

const DEMO = [
  ['Patient', 'patient@hospital.com', 'patient123'],
  ['Doctor', 'asha@hospital.com', 'doctor123'],
  ['Admin', 'admin@hospital.com', 'admin123'],
]

export default function Auth() {
  const [mode, setMode] = useState('login')
  const [f, setF] = useState({ name: '', email: '', password: '', age: '', gender: '', phone: '', bloodGroup: '', address: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const { signIn } = useAuth()
  const nav = useNavigate()
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setError(''); setBusy(true)
    try {
      const body = mode === 'login' ? { email: f.email, password: f.password } : { ...f, age: f.age ? Number(f.age) : null }
      const { data } = await api.post(`/auth/${mode === 'login' ? 'login' : 'register'}`, body)
      signIn(data)
      nav(homeFor(data.role))
    } catch (err) { setError(errMsg(err)) }
    setBusy(false)
  }

  return (
    <div className="auth">
      <section className="auth-side">
        <div className="brand"><span className="mark">+</span> CareLink</div>
        <h1>One place for every visit, record and bill.</h1>
        <p>Patients book and pay online, doctors consult and prescribe, and the hospital team keeps wards, stock and accounts in order.</p>
        <ul className="roles">
          <li className="r-patient"><b>Patients</b> book a doctor, see records, pay bills</li>
          <li className="r-doctor"><b>Doctors</b> review history, diagnose, prescribe</li>
          <li className="r-admin"><b>Admins</b> manage people, stock, billing and reports</li>
        </ul>
      </section>

      <section className="auth-card">
        <div className="tabs">
          <button className={mode === 'login' ? 'on' : ''} onClick={() => { setMode('login'); setError('') }}>Sign in</button>
          <button className={mode === 'signup' ? 'on' : ''} onClick={() => { setMode('signup'); setError('') }}>Create patient account</button>
        </div>

        <form className="form" onSubmit={submit}>
          {mode === 'signup' && <Field label="Full name"><input value={f.name} onChange={set('name')} required /></Field>}
          <Field label="Email"><input type="email" value={f.email} onChange={set('email')} required autoComplete="username" /></Field>
          <Field label="Password" hint={mode === 'signup' ? 'At least 6 characters' : undefined}>
            <input type="password" value={f.password} onChange={set('password')} required minLength={mode === 'signup' ? 6 : undefined}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
          </Field>
          {mode === 'signup' && (
            <div className="grid2">
              <Field label="Age"><input type="number" min="0" max="120" value={f.age} onChange={set('age')} /></Field>
              <Field label="Gender">
                <select value={f.gender} onChange={set('gender')}><option value="">Select…</option><option>Female</option><option>Male</option><option>Other</option></select>
              </Field>
              <Field label="Phone"><input value={f.phone} onChange={set('phone')} /></Field>
              <Field label="Blood group"><input value={f.bloodGroup} onChange={set('bloodGroup')} placeholder="e.g. O+" /></Field>
            </div>
          )}
          {error && <div className="form-error" role="alert">{error}</div>}
          <button className="btn block" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
        </form>

        {mode === 'login' && (
          <div className="demo">
            <p>Try a demo account</p>
            <div>{DEMO.map(([l, e, p]) => (
              <button key={l} className="btn small ghost" onClick={() => setF({ ...f, email: e, password: p })}>{l}</button>
            ))}</div>
          </div>
        )}
      </section>
    </div>
  )
}
