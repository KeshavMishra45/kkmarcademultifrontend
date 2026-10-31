/* KKM Games: talks to the Express backend. Loaded before app.js.
   Backend address comes from js/config.js (KKM_API_URL); on localhost it falls back to http://localhost:5000 */
const _cfg = (window.KKM_API_URL || '').replace(/\/+$/, '');
const _local = ['localhost', '127.0.0.1'].includes(location.hostname);
const API_BASE = (_cfg && !_cfg.includes('YOUR-BACKEND')) ? _cfg : (_local ? 'http://localhost:5000' : '');

const api = {
  token: localStorage.getItem('kkm_token'),
  setToken(t) { this.token = t; t ? localStorage.setItem('kkm_token', t) : localStorage.removeItem('kkm_token'); },
  async req(method, path, body) {
    let res;
    try {
      res = await fetch(API_BASE + path, {
        method,
        headers: { 'Content-Type': 'application/json', ...(this.token ? { Authorization: 'Bearer ' + this.token } : {}) },
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw Object.assign(new Error('Cannot reach the server. Is the backend running?'), { status: 0 });
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(data.error || 'Something went wrong.'), { status: res.status });
    return data;
  },
  get(p) { return this.req('GET', p); },
  post(p, b) { return this.req('POST', p, b || {}); },
  put(p, b) { return this.req('PUT', p, b || {}); },
};
