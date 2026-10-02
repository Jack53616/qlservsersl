const TOKEN_KEY = 'qlai_admin_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || '';
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`/api/admin${path}`, { ...options, headers });
  let data;
  try {
    data = await res.json();
  } catch (_) {
    data = { ok: false, error: 'server' };
  }
  if (res.status === 401) {
    setToken('');
    window.dispatchEvent(new CustomEvent('qlai:unauthorized'));
  }
  if (!res.ok || data.ok === false) {
    const err = new Error(data.error || 'request_failed');
    err.payload = data;
    throw err;
  }
  return data;
}

async function upload(path, formData) {
  const token = getToken();
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`/api/admin${path}`, { method: 'POST', headers, body: formData });
  const data = await res.json().catch(() => ({ ok: false, error: 'server' }));
  if (!res.ok || data.ok === false) {
    const err = new Error(data.error || 'request_failed');
    err.payload = data;
    throw err;
  }
  return data;
}

export const api = {
  login: (username, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  me: () => request('/auth/me'),
  uploadAvatar: (file) => {
    const fd = new FormData();
    fd.append('avatar', file);
    return upload('/me/avatar', fd);
  },
  stats: () => request('/stats'),
  keys: (params = {}) => request(`/keys?${new URLSearchParams(params)}`),
  createKey: (plan, billing) => request('/keys', { method: 'POST', body: JSON.stringify({ plan, billing }) }),
  patchKey: (id, body) => request(`/keys/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteKey: (id) => request(`/keys/${id}`, { method: 'DELETE' }),
  users: (params = {}) => request(`/users?${new URLSearchParams(params)}`),
  admins: () => request('/admins'),
  createAdmin: (body) => request('/admins', { method: 'POST', body: JSON.stringify(body) }),
  patchAdmin: (id, body) => request(`/admins/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteAdmin: (id) => request(`/admins/${id}`, { method: 'DELETE' }),
  activity: (params = {}) => request(`/activity?${new URLSearchParams(params)}`)
};
