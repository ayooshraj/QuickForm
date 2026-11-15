import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api';

// Uploads a file straight to Cloudinary using a short-lived signature from our API.
async function uploadToCloudinary(slug, file) {
  const sig = await api(`/api/public/forms/${slug}/upload-signature`);
  const body = new FormData();
  body.append('file', file);
  body.append('api_key', sig.apiKey);
  body.append('timestamp', sig.timestamp);
  body.append('folder', sig.folder);
  body.append('signature', sig.signature);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/auto/upload`, { method: 'POST', body });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Upload failed');
  return data.secure_url;
}

function Shell({ children }) {
  return (
    <div className="pubwrap">
      <div className="pub">
        {children}
        <p className="powered">Made with <a href="/">QuickForm</a></p>
      </div>
    </div>
  );
}

export default function PublicForm() {
  const { slug } = useParams();
  const [form, setForm] = useState(null);
  const [answers, setAnswers] = useState({});
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('idle'); // idle | sending | done
  const [error, setError] = useState('');

  useEffect(() => { api(`/api/public/forms/${slug}`).then((d) => { setForm(d.form); document.title = d.form.title; }).catch((e) => setError(e.message)); }, [slug]);

  const set = (key, value) => setAnswers({ ...answers, [key]: value });
  const toggle = (key, opt) => {
    const cur = answers[key] || [];
    set(key, cur.includes(opt) ? cur.filter((o) => o !== opt) : [...cur, opt]);
  };

  const submit = async (e) => {
    e.preventDefault();
    setStatus('sending'); setErrors({}); setError('');
    try {
      const final = { ...answers };
      for (const f of form.fields) {
        if (f.type === 'file' && final[f.key] instanceof File) final[f.key] = await uploadToCloudinary(slug, final[f.key]);
      }
      await api(`/api/public/forms/${slug}/responses`, { method: 'POST', body: { answers: final } });
      setStatus('done');
    } catch (err) {
      setStatus('idle');
      setError(err.message);
      if (err.details && typeof err.details === 'object') setErrors(err.details);
    }
  };

  if (error && !form) return <Shell><div className="sheet"><h2>This form is not available</h2><p className="muted" style={{ marginTop: 6 }}>{error}</p></div></Shell>;
  if (!form) return <Shell><div className="sheet" aria-busy="true"><div className="stack"><div className="skel" style={{ width: '55%' }} /><div className="skel" style={{ width: '80%' }} /><div className="skel" style={{ width: '40%' }} /></div></div></Shell>;
  if (status === 'done') {
    return (
      <Shell>
        <div className="sheet done">
          <span className="stamp still" aria-hidden="true">Received</span>
          <h2 style={{ marginTop: 18 }}>Thank you</h2>
          <p className="muted">Your response to “{form.title}” has been recorded.</p>
        </div>
      </Shell>
    );
  }
  if (!form.acceptingResponses) return <Shell><div className="sheet"><h2>{form.title}</h2><p className="muted" style={{ marginTop: 6 }}>This form is no longer accepting responses.</p></div></Shell>;

  return (
    <Shell>
      <form className="sheet" onSubmit={submit} noValidate>
        <h1>{form.title}</h1>
        {form.description && <p className="desc">{form.description}</p>}
        {!form.description && <div style={{ height: 18 }} />}
        {form.fields.map((f) => {
          const id = `q-${f.key}`;
          const label = <span className="label" id={`${id}-l`}>{f.label}{f.required && <span style={{ color: 'var(--stamp)' }}> *</span>}</span>;
          const err = errors[f.key] && <div className="error" role="alert">{errors[f.key]}</div>;
          const cls = `field${errors[f.key] ? ' has-error' : ''}`;
          if (['radio', 'checkbox', 'rating'].includes(f.type)) {
            return (
              <div key={f.key} className={cls} role={f.type === 'radio' ? 'radiogroup' : 'group'} aria-labelledby={`${id}-l`}>
                {label}
                {f.type === 'radio' && <div className="choices">{f.options.map((o) => (
                  <label key={o} className="choice"><input type="radio" name={f.key} checked={answers[f.key] === o} onChange={() => set(f.key, o)} /><span>{o}</span></label>
                ))}</div>}
                {f.type === 'checkbox' && <div className="choices">{f.options.map((o) => (
                  <label key={o} className="choice"><input type="checkbox" checked={(answers[f.key] || []).includes(o)} onChange={() => toggle(f.key, o)} /><span>{o}</span></label>
                ))}</div>}
                {f.type === 'rating' && <div className="choices rate">{[1, 2, 3, 4, 5].map((n) => (
                  <label key={n} className="choice"><input type="radio" name={f.key} checked={answers[f.key] === n} onChange={() => set(f.key, n)} aria-label={`${n} out of 5`} /><span>{n}</span></label>
                ))}</div>}
                {err}
              </div>
            );
          }
          return (
            <div key={f.key} className={cls}>
              <label htmlFor={id}>{label}</label>
              {f.type === 'text' && <input id={id} value={answers[f.key] || ''} onChange={(e) => set(f.key, e.target.value)} />}
              {f.type === 'email' && <input id={id} type="email" autoComplete="email" value={answers[f.key] || ''} onChange={(e) => set(f.key, e.target.value)} />}
              {f.type === 'number' && <input id={id} type="number" value={answers[f.key] ?? ''} onChange={(e) => set(f.key, e.target.value)} />}
              {f.type === 'date' && <input id={id} type="date" value={answers[f.key] || ''} onChange={(e) => set(f.key, e.target.value)} />}
              {f.type === 'textarea' && <textarea id={id} rows="4" value={answers[f.key] || ''} onChange={(e) => set(f.key, e.target.value)} />}
              {f.type === 'select' && (
                <select id={id} value={answers[f.key] || ''} onChange={(e) => set(f.key, e.target.value)}>
                  <option value="">Choose one</option>
                  {f.options.map((o) => <option key={o}>{o}</option>)}
                </select>
              )}
              {f.type === 'file' && <input id={id} type="file" onChange={(e) => set(f.key, e.target.files[0])} />}
              {err}
            </div>
          );
        })}
        {error && <p className="notice bad" role="alert" style={{ marginBottom: 16 }}>{error}</p>}
        <button className="btn solid" type="submit" disabled={status === 'sending'}>{status === 'sending' ? 'Sending…' : 'Send response'}</button>
      </form>
    </Shell>
  );
}
