import { useState } from 'react'
import api, { errMsg } from '../api'
import { Modal, useToast, fmtDate } from './ui'
import SlotPicker from './SlotPicker'

export default function RescheduleModal({ appt, onClose, onDone }) {
  const [date, setDate] = useState(appt.date)
  const [time, setTime] = useState('')
  const toast = useToast()

  const save = async (e) => {
    e.preventDefault()
    if (!time) return toast('Pick a time slot', 'error')
    try {
      await api.put(`/appointments/${appt.id}/reschedule`, { date, time })
      toast('Appointment rescheduled')
      onDone()
    } catch (err) { toast(errMsg(err), 'error') }
  }

  return (
    <Modal title="Reschedule appointment" onClose={onClose}>
      <form onSubmit={save} className="form">
        <p className="muted">With {appt.doctor.user.name}. Currently {fmtDate(appt.date)}.</p>
        <SlotPicker doctorId={appt.doctor.id} date={date} time={time} onChange={(d, t) => { setDate(d); setTime(t) }} />
        <div className="form-actions">
          <button type="button" className="btn ghost" onClick={onClose}>Keep current time</button>
          <button className="btn">Save new time</button>
        </div>
      </form>
    </Modal>
  )
}
