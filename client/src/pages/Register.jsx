import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../AuthContext';

export default function Register() {
  const [form, setForm] = useState({ orgName: '', name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      const d = await api('/api/auth/register', { method: 'POST', body: form });
      login(d.token, d.user);
      navigate('/');
    } catch (err) { setError(err.message); setBusy(false); }
  };

  return (
    <form className="sheet narrow" onSubmit={submit}>
      <h1>Create your workspace</h1>
      <p className="muted" style={{ margin: '4px 0 24px' }}>You become the owner. Add editors and viewers once you are in.</p>
      <label className="field">
        <span className="label">Organisation name</span>
        <input value={form.orgName} onChange={set('orgName')} autoComplete="organization" required />
      </label>
      <label className="field">
        <span className="label">Your name</span>
        <input value={form.name} onChange={set('name')} autoComplete="name" required />
      </label>
      <label className="field">
        <span className="label">Email</span>
        <input type="email" value={form.email} onChange={set('email')} autoComplete="email" required />
      </label>
      <label className="field">
        <span className="label">Password</span>
        <input type="password" value={form.password} onChange={set('password')} minLength={6} autoComplete="new-password" required />
        <span className="hint">At least 6 characters.</span>
      </label>
      {error && <p className="notice bad" role="alert" style={{ marginBottom: 16 }}>{error}</p>}
      <div className="row between">
        <button className="btn solid" type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create workspace'}</button>
        <span className="muted small">Have an account? <Link to="/login">Sign in</Link></span>
      </div>
    </form>
  );
}
