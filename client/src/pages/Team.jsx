import { useEffect, useState } from 'react';
import { api } from '../api';

const BLANK = { name: '', email: '', password: '', role: 'editor' };

export default function Team() {
  const [users, setUsers] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [error, setError] = useState('');
  const [added, setAdded] = useState('');
  const load = () => api('/api/users').then((d) => setUsers(d.users)).catch((e) => { setError(e.message); setUsers([]); });
  useEffect(() => { load(); }, []);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const add = async (e) => {
    e.preventDefault(); setError(''); setAdded('');
    try {
      await api('/api/users', { method: 'POST', body: form });
      setAdded(`${form.name} was added as ${form.role}.`);
      setForm(BLANK); load();
    } catch (err) { setError(err.message); }
  };

  return (
    <div style={{ paddingBottom: 64 }}>
      <div className="pagehead"><h1>Team</h1></div>
      <div className="grid">
        <section className="sheet flat scroll-x">
          {users === null ? (
            <div className="stack" aria-busy="true"><div className="skel" style={{ width: '60%' }} /><div className="skel" style={{ width: '45%' }} /></div>
          ) : (
            <table>
              <thead><tr><th>Name</th><th>Email</th><th>Role</th></tr></thead>
              <tbody>{users.map((u) => <tr key={u.id}><td style={{ fontWeight: 600 }}>{u.name}</td><td>{u.email}</td><td><span className="chip">{u.role}</span></td></tr>)}</tbody>
            </table>
          )}
          <p className="muted small" style={{ marginTop: 18 }}>Editors build forms and see responses. Viewers see charts only, never the raw answers.</p>
        </section>

        <form className="sheet" onSubmit={add}>
          <h3 style={{ marginBottom: 16 }}>Add a team member</h3>
          <label className="field"><span className="label">Name</span><input value={form.name} onChange={set('name')} required /></label>
          <label className="field"><span className="label">Email</span><input type="email" value={form.email} onChange={set('email')} required /></label>
          <label className="field"><span className="label">Temporary password</span><input value={form.password} onChange={set('password')} minLength={6} required /><span className="hint">At least 6 characters. Share it with them privately.</span></label>
          <label className="field"><span className="label">Role</span><select value={form.role} onChange={set('role')}><option value="editor">Editor</option><option value="viewer">Viewer</option></select></label>
          <div role="status">
            {added && <p className="notice" style={{ marginBottom: 14 }}>{added}</p>}
            {error && <p className="notice bad" style={{ marginBottom: 14 }}>{error}</p>}
          </div>
          <button className="btn solid" type="submit">Add member</button>
        </form>
      </div>
    </div>
  );
}
