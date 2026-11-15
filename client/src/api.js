// Thin fetch wrapper: adds the JWT, parses JSON, turns API errors into thrown Errors.
const BASE = import.meta.env.VITE_API_URL || '';

export function getToken() { return localStorage.getItem('qf_token'); }
export function setSession(token, user) {
  localStorage.setItem('qf_token', token);
  localStorage.setItem('qf_user', JSON.stringify(user));
}
export function clearSession() { localStorage.removeItem('qf_token'); localStorage.removeItem('qf_user'); }
export function getUser() {
  try { return JSON.parse(localStorage.getItem('qf_user')); } catch { return null; }
}

export async function api(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.status = res.status;
    err.details = data.details; // per-field validation messages, when the API sends them
    throw err;
  }
  return data;
}
