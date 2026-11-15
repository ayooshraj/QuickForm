import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../AuthContext';

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

export default function Forms() {
  const { user, socket } = useAuth();
  const [forms, setForms] = useState(null); // null while loading
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const canEdit = user.role !== 'viewer';

  useEffect(() => { api('/api/forms').then((d) => setForms(d.forms)).catch((e) => { setError(e.message); setForms([]); }); }, []);

  // Live response counters on the list (org-wide 'form:count' event).
  useEffect(() => {
    if (!socket) return undefined;
    const onCount = ({ formId, responseCount }) =>
      setForms((fs) => fs && fs.map((f) => (f._id === formId ? { ...f, responseCount } : f)));
    socket.on('form:count', onCount);
    return () => socket.off('form:count', onCount);
  }, [socket]);

  const create = async () => {
    try {
      const d = await api('/api/forms', { method: 'POST', body: { title: 'Untitled form', fields: [] } });
      navigate(`/forms/${d.form._id}/edit`);
    } catch (err) { setError(err.message); }
  };

  const total = forms ? forms.reduce((s, f) => s + f.responseCount, 0) : 0;

  return (
    <div className="stack" style={{ paddingBottom: 64 }}>
      <div className="pagehead">
        <div>
          <h1>Forms</h1>
          {forms && forms.length > 0 && <p className="muted" style={{ marginTop: 6 }}>{plural(forms.length, 'form')} and {plural(total, 'response')} so far.</p>}
        </div>
        {canEdit && <button className="btn solid" onClick={create}>New form</button>}
      </div>

      {error && <p className="notice bad" role="alert">{error}</p>}

      <div className="sheet flat scroll-x">
        {forms === null && (
          <div className="stack" aria-busy="true" aria-label="Loading forms">
            <div className="skel" style={{ width: '60%' }} /><div className="skel" style={{ width: '45%' }} /><div className="skel" style={{ width: '70%' }} />
          </div>
        )}
        {forms && forms.length === 0 && !error && (
          <div className="empty">
            <h3>No forms yet</h3>
            <p>{canEdit ? 'Create your first form, add a few questions and publish it to get a link you can share.' : 'An editor has not created any forms yet.'}</p>
            {canEdit && <button className="btn solid" onClick={create}>Create your first form</button>}
          </div>
        )}
        {forms && forms.length > 0 && (
          <table>
            <thead><tr><th>Title</th><th>Status</th><th className="num">Responses</th><th><span className="sr-only" style={{ position: 'absolute', left: -999 }}>Actions</span></th></tr></thead>
            <tbody>
              {forms.map((f) => (
                <tr key={f._id}>
                  <td><Link to={canEdit ? `/forms/${f._id}/edit` : `/forms/${f._id}/results`} style={{ fontWeight: 600, color: 'inherit' }}>{f.title}</Link></td>
                  <td><span className={`chip ${f.status}`}>{f.status}</span></td>
                  <td className="num">{f.responseCount}</td>
                  <td className="actions">
                    {canEdit && <Link to={`/forms/${f._id}/edit`}>Edit</Link>}
                    <Link to={`/forms/${f._id}/results`}>Results</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
