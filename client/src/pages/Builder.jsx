import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import { CHOICE_TYPES, FIELD_TYPES } from '../fieldTypes';

const blankField = () => ({ label: '', type: 'text', required: false, options: [] });

export default function Builder() {
  const { id } = useParams();
  const [form, setForm] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => { api(`/api/forms/${id}`).then((d) => setForm(d.form)).catch((e) => setError(e.message)); }, [id]);

  const updateField = (i, patch) => setForm({ ...form, fields: form.fields.map((f, j) => (j === i ? { ...f, ...patch } : f)) });
  const move = (i, dir) => {
    const fields = [...form.fields];
    const j = i + dir;
    if (j < 0 || j >= fields.length) return;
    [fields[i], fields[j]] = [fields[j], fields[i]];
    setForm({ ...form, fields });
  };
  const remove = (i) => setForm({ ...form, fields: form.fields.filter((_, j) => j !== i) });

  const save = async () => {
    setError(''); setMessage('');
    try {
      const d = await api(`/api/forms/${id}`, { method: 'PUT', body: { title: form.title, description: form.description, fields: form.fields } });
      setForm(d.form); setMessage('Saved');
      return true;
    } catch (err) { setError(err.message); return false; }
  };
  const setStatus = async (status) => {
    if (!(await save())) return;
    try {
      const d = await api(`/api/forms/${id}/status`, { method: 'PATCH', body: { status } });
      setForm(d.form); setMessage(status === 'published' ? 'Published' : `Form is now ${status}`);
    } catch (err) { setError(err.message); }
  };

  if (!form) return <div className="sheet flat" style={{ marginTop: 24 }}>{error ? <p className="notice bad" role="alert">{error}</p> : <div className="stack" aria-busy="true"><div className="skel" style={{ width: '50%' }} /><div className="skel" style={{ width: '70%' }} /></div>}</div>;

  const shareUrl = `${window.location.origin}/f/${form.slug}`;
  const copy = async () => {
    try { await navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* user can copy by hand */ }
  };

  return (
    <div style={{ paddingBottom: 64 }}>
      <div className="pagehead">
        <div>
          <p className="crumb"><Link to="/">All forms</Link></p>
          <h1>Build your form</h1>
        </div>
        <Link to={`/forms/${id}/results`} className="btn">View results</Link>
      </div>

      <div className="grid">
        <section className="sheet flat">
          <label className="field">
            <span className="label">Title</span>
            <input className="title-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </label>
          <label className="field">
            <span className="label">Description</span>
            <textarea rows="2" placeholder="Optional. Shown under the title." value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </label>

          <h3 style={{ margin: '28px 0 4px' }}>Questions</h3>
          {form.fields.length === 0 && <p className="muted">No questions yet. Add the first one below.</p>}
          {form.fields.map((f, i) => (
            <div key={f.key || i} className="fed">
              <div className="fed-top">
                <label className="field">
                  <span className="label">Question {i + 1}</span>
                  <input placeholder="What do you want to ask…" value={f.label} onChange={(e) => updateField(i, { label: e.target.value })} />
                </label>
                <label className="field">
                  <span className="label">Answer type</span>
                  <select value={f.type} onChange={(e) => updateField(i, { type: e.target.value })}>
                    {FIELD_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </label>
              </div>
              {CHOICE_TYPES.includes(f.type) && (
                <label className="field">
                  <span className="label">Options</span>
                  <input placeholder="Free, Pro, Enterprise…"
                    value={(f.options || []).join(', ')}
                    onChange={(e) => updateField(i, { options: e.target.value.split(',').map((o) => o.trimStart()) })} />
                  <span className="hint">Separate options with commas.</span>
                </label>
              )}
              <div className="fed-actions">
                <label className="check"><input type="checkbox" checked={f.required} onChange={(e) => updateField(i, { required: e.target.checked })} /> Required</label>
                <span className="grow" />
                <button type="button" className="btn small" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move question ${i + 1} up`}>Up</button>
                <button type="button" className="btn small" onClick={() => move(i, 1)} disabled={i === form.fields.length - 1} aria-label={`Move question ${i + 1} down`}>Down</button>
                <button type="button" className="btn small danger" onClick={() => remove(i)}>Remove</button>
              </div>
            </div>
          ))}
          <button type="button" className="btn" onClick={() => setForm({ ...form, fields: [...form.fields, blankField()] })}>Add question</button>
        </section>

        <aside className="sheet side">
          <h3>Publish</h3>
          <div className="stack">
            <p>Status <span className={`chip ${form.status}`}>{form.status}</span></p>
            <button className="btn solid" onClick={save}>Save changes</button>
            {form.status !== 'published' && <button className="btn" onClick={() => setStatus('published')}>Save and publish</button>}
            {form.status === 'published' && <button className="btn" onClick={() => setStatus('closed')}>Stop accepting responses</button>}
            {form.status === 'published' && (
              <div>
                <p className="label small" style={{ fontWeight: 600, marginBottom: 6 }}>Share link</p>
                <div className="sharebox">
                  <input readOnly value={shareUrl} onFocus={(e) => e.target.select()} aria-label="Share link" />
                  <button className="btn small" onClick={copy}>{copied ? 'Copied' : 'Copy'}</button>
                </div>
                <p style={{ marginTop: 8 }}><Link to={`/f/${form.slug}`} target="_blank" rel="noreferrer">Open the public form</Link></p>
              </div>
            )}
            <div role="status">
              {message && <p className="notice">{message}</p>}
              {error && <p className="notice bad">{error}</p>}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
