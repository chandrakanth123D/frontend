import { useEffect, useState } from 'react'
import api, { errMsg } from '../api'
import { Modal, Field, Empty, PageHead, Loading, useToast } from './ui'

/**
 * Config-driven list + add/edit/delete page used for patients, doctors and medicines.
 * fields: [{ name, label, type: text|email|password|number|date|select|textarea, options, required }]
 */
export default function CrudPage({ title, sub, noun, endpoint, columns, fields, blank, toForm = (x) => x, rowActions, rowClass }) {
  const [rows, setRows] = useState(null)
  const [form, setForm] = useState(null)
  const [editId, setEditId] = useState(null)
  const [q, setQ] = useState('')
  const toast = useToast()

  const load = () => api.get(endpoint).then((r) => setRows(r.data)).catch((e) => toast(errMsg(e), 'error'))
  useEffect(() => { load() }, [endpoint])

  const open = (row) => { setEditId(row ? row.id : null); setForm(row ? toForm(row) : { ...blank }) }
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const save = async (e) => {
    e.preventDefault()
    const body = { ...form }
    fields.filter((f) => f.type === 'number').forEach((f) => { body[f.name] = body[f.name] === '' || body[f.name] == null ? null : Number(body[f.name]) })
    Object.keys(body).forEach((k) => { if (body[k] === '') body[k] = null })
    try {
      editId ? await api.put(`${endpoint}/${editId}`, body) : await api.post(endpoint, body)
      toast(`${noun} ${editId ? 'updated' : 'added'}`)
      setForm(null); load()
    } catch (err) { toast(errMsg(err), 'error') }
  }

  const remove = async (row) => {
    if (!window.confirm(`Delete this ${noun.toLowerCase()}? This cannot be undone.`)) return
    try { await api.delete(`${endpoint}/${row.id}`); toast(`${noun} deleted`); load() }
    catch (err) { toast(errMsg(err), 'error') }
  }

  const shown = (rows || []).filter((r) => JSON.stringify(r).toLowerCase().includes(q.toLowerCase()))

  return (
    <>
      <PageHead title={title} sub={sub}>
        <input className="search" placeholder={`Search ${title.toLowerCase()}`} value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn" onClick={() => open(null)}>Add {noun.toLowerCase()}</button>
      </PageHead>

      {!rows ? <Loading /> : shown.length === 0 ? (
        <Empty text={q ? 'No matches for that search.' : `No ${title.toLowerCase()} yet.`}>
          {!q && <button className="btn" onClick={() => open(null)}>Add the first {noun.toLowerCase()}</button>}
        </Empty>
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr>{columns.map((c) => <th key={c.label}>{c.label}</th>)}<th /></tr></thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id} className={rowClass ? rowClass(r) : ''}>
                  {columns.map((c) => <td key={c.label}>{c.render(r)}</td>)}
                  <td className="row-actions">
                    {rowActions && rowActions(r, load)}
                    <button className="btn small ghost" onClick={() => open(r)}>Edit</button>
                    <button className="btn small danger" onClick={() => remove(r)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {form && (
        <Modal title={`${editId ? 'Edit' : 'Add'} ${noun.toLowerCase()}`} onClose={() => setForm(null)}>
          <form className="form grid2" onSubmit={save}>
            {fields.map((f) => (
              <Field key={f.name} label={f.label} hint={f.type === 'password' && editId ? 'Leave blank to keep the current password' : undefined}>
                {f.type === 'select' ? (
                  <select value={form[f.name] ?? ''} onChange={(e) => set(f.name, e.target.value)} required={f.required}>
                    <option value="">Select…</option>
                    {f.options.map((o) => <option key={o}>{o}</option>)}
                  </select>
                ) : f.type === 'textarea' ? (
                  <textarea rows="3" value={form[f.name] ?? ''} onChange={(e) => set(f.name, e.target.value)} />
                ) : (
                  <input type={f.type || 'text'} value={form[f.name] ?? ''} step={f.type === 'number' ? 'any' : undefined}
                    required={f.type === 'password' ? !editId : f.required} minLength={f.type === 'password' ? 6 : undefined}
                    onChange={(e) => set(f.name, e.target.value)} />
                )}
              </Field>
            ))}
            <div className="form-actions span2">
              <button type="button" className="btn ghost" onClick={() => setForm(null)}>Cancel</button>
              <button className="btn">Save {noun.toLowerCase()}</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}
