import { useEffect, useState } from 'react'
import api from '../api'
import { SLOTS, fmtTime, today } from './ui'

/** Date + time slot chooser. Booked slots for the doctor are disabled. */
export default function SlotPicker({ doctorId, date, time, onChange }) {
  const [booked, setBooked] = useState([])

  useEffect(() => {
    if (!doctorId || !date) return
    api.get('/appointments/slots', { params: { doctorId, date } }).then((r) => setBooked(r.data)).catch(() => setBooked([]))
  }, [doctorId, date])

  const now = new Date()
  const isPast = (s) => date === today() && new Date(`${date}T${s}:00`) <= now

  return (
    <>
      <label className="field">
        <span>Date</span>
        <input type="date" min={today()} value={date} onChange={(e) => onChange(e.target.value, '')} required />
      </label>
      <div className="field">
        <span>Time</span>
        <div className="slots">
          {SLOTS.map((s) => (
            <button type="button" key={s} disabled={booked.includes(s) || isPast(s)}
              className={`slot ${time === s ? 'on' : ''}`} onClick={() => onChange(date, s)}>
              {fmtTime(s)}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
