import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, getToken } from '../api';
import { useAuth } from '../AuthContext';
import Bars from '../components/Bars';

const BASE = import.meta.env.VITE_API_URL || '';
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const shortDate = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

// Responses per day as plain columns; the busiest day is drawn in full ink.
function PerDay({ days }) {
  if (!days.length) return <p className="muted">No responses in the last 14 days.</p>;
  const max = Math.max(...days.map((d) => d.count));
  const W = 560, H = 96, gap = 6;
  const bw = Math.min(40, (W - gap * (days.length - 1)) / days.length);
  const total = bw * days.length + gap * (days.length - 1);
  const x0 = (W - total) / 2;
  return (
    <svg className="spark" viewBox={`0 0 ${W} ${H + 24}`} role="img" aria-label={`Responses per day: ${days.map((d) => `${shortDate(d.date)} ${d.count}`).join(', ')}`}>
      <line x1="0" y1={H} x2={W} y2={H} stroke="var(--ink)" strokeWidth="1.5" />
      {days.map((d, i) => {
        const h = Math.max(3, (d.count / max) * (H - 18));
        const x = x0 + i * (bw + gap);
        return (
          <g key={d.date}>
            <rect x={x} y={H - h} width={bw} height={h} fill={d.count === max ? 'var(--ink)' : 'var(--blue)'} />
            <text x={x + bw / 2} y={H - h - 5} textAnchor="middle">{d.count}</text>
          </g>
        );
      })}
      <text x={x0} y={H + 17}>{shortDate(days[0].date)}</text>
      {days.length > 1 && <text x={x0 + total} y={H + 17} textAnchor="end">{shortDate(days[days.length - 1].date)}</text>}
    </svg>
  );
}

export default function Results() {
  const { id } = useParams();
  const { user, socket } = useAuth();
  const canSeeResponses = user.role !== 'viewer';
  const [form, setForm] = useState(null);
  const [stats, setStats] = useState(null);
  const [responses, setResponses] = useState([]);
  const [live, setLive] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [f, a] = await Promise.all([api(`/api/forms/${id}`), api(`/api/forms/${id}/analytics`)]);
      setForm(f.form); setStats(a);
      if (canSeeResponses) setResponses((await api(`/api/forms/${id}/responses?limit=50`)).items);
    } catch (err) { setError(err.message); }
  }, [id, canSeeResponses]);

  useEffect(() => { load(); }, [load]);

  // Join this form's room; every new submission refreshes the dashboard instantly.
  useEffect(() => {
    if (!socket) return undefined;
    socket.emit('form:watch', id, (ack) => setLive(Boolean(ack && ack.ok)));
    const onNew = () => load();
    socket.on('response:new', onNew);
    return () => { socket.off('response:new', onNew); socket.emit('form:unwatch', id); };
  }, [socket, id, load]);

  // CSV needs the auth header, so fetch it as a blob instead of a plain link.
  const downloadCsv = async () => {
    const res = await fetch(`${BASE}/api/forms/${id}/export.csv`, { headers: { Authorization: `Bearer ${getToken()}` } });
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement('a');
    a.href = url; a.download = `${form.slug}-responses.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  if (!form || !stats) return <div className="sheet flat" style={{ marginTop: 24 }}>{error ? <p className="notice bad" role="alert">{error}</p> : <div className="stack" aria-busy="true"><div className="skel" style={{ width: '50%' }} /><div className="skel" style={{ width: '70%' }} /></div>}</div>;

  const rated = stats.fields.find((f) => f.type === 'rating' && f.avg != null);
  const choice = stats.fields.find((f) => f.counts && Object.values(f.counts).some((n) => n > 0));
  const topOption = choice && Object.entries(choice.counts).sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="stack" style={{ paddingBottom: 64, gap: 32 }}>
      <div className="pagehead" style={{ paddingBottom: 0 }}>
        <div>
          <p className="crumb"><Link to="/">All forms</Link></p>
          <h1>{form.title}</h1>
        </div>
        <div className="row">
          <span className={`live ${live ? 'on' : ''}`}>{live ? 'Live' : 'Offline'}</span>
          {user.role !== 'viewer' && <Link to={`/forms/${id}/edit`} className="btn small">Edit form</Link>}
          {canSeeResponses && <button className="btn small solid" onClick={downloadCsv}>Export CSV</button>}
        </div>
      </div>

      <p className="sum" data-testid="summary">
        <b data-testid="total">{stats.total}</b> {stats.total === 1 ? 'response' : 'responses'}.
        {topOption && topOption[1] > 0 && <> “{topOption[0]}” is the most common answer to “{choice.label}”, chosen by {topOption[1]}.</>}
        {rated && <> The average rating is <b>{rated.avg} out of 5</b>.</>}
        {stats.total === 0 && <> Share the form link to start collecting answers.</>}
      </p>

      <hr className="divider" />

      <section>
        <h3 style={{ marginBottom: 12 }}>Responses per day</h3>
        <PerDay days={stats.perDay} />
      </section>

      <div className="grid2">
        {stats.fields.map((f) => (
          <div key={f.key} className="q">
            <h3>{f.label}</h3>
            <p className="n">{plural(f.answered ?? Object.values(f.counts || {}).reduce((s, n) => s + n, 0), 'answer')}</p>
            {f.counts && <Bars counts={f.counts} />}
            {f.avg !== undefined && <p>Average <b>{f.avg ?? '–'}</b>. Lowest {f.min ?? '–'}, highest {f.max ?? '–'}.</p>}
          </div>
        ))}
      </div>

      {canSeeResponses && (
        <section>
          <hr className="divider" style={{ marginBottom: 24 }} />
          <h3 style={{ marginBottom: 12 }}>Latest responses</h3>
          {responses.length === 0 ? <p className="muted">No responses yet.</p> : (
            <div className="scroll-x">
              <table>
                <thead><tr><th>Submitted</th>{form.fields.map((f) => <th key={f.key}>{f.label}</th>)}</tr></thead>
                <tbody>
                  {responses.map((r) => (
                    <tr key={r._id}>
                      <td className="num" style={{ whiteSpace: 'nowrap' }}>{new Date(r.createdAt).toLocaleString()}</td>
                      {form.fields.map((f) => {
                        const v = r.answers[f.key];
                        const text = Array.isArray(v) ? v.join(', ') : v;
                        return <td key={f.key}>{f.type === 'file' && v ? <a href={v} target="_blank" rel="noreferrer">View file</a> : text}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
