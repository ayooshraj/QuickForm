import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../AuthContext';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      const d = await api('/api/auth/login', { method: 'POST', body: form });
      login(d.token, d.user);
      navigate('/');
    } catch (err) { setError(err.message); setBusy(false); }
  };

  return (
    <form className="sheet narrow" onSubmit={submit}>
      <h1>Sign in</h1>
      <p className="muted" style={{ margin: '4px 0 24px' }}>Pick up where you left off.</p>
      <label className="field">
        <span className="label">Email</span>
        <input type="email" value={form.email} onChange={set('email')} autoComplete="email" required />
      </label>
      <label className="field">
        <span className="label">Password</span>
        <input type="password" value={form.password} onChange={set('password')} autoComplete="current-password" required />
      </label>
      {error && <p className="notice bad" role="alert" style={{ marginBottom: 16 }}>{error}</p>}
      <div className="row between">
        <button className="btn solid" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <span className="muted small">New here? <Link to="/register">Create a workspace</Link></span>
      </div>
    </form>
  );
}
