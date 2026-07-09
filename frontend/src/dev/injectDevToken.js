const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

export default async function injectDevToken() {
  if (import.meta.env.MODE !== 'development') return;

  // skip if already present
  if (localStorage.getItem('access_token')) return;

  try {
    const res = await fetch(`${API_BASE}/dev-token/`);
    const json = await res.json();
    const token = json?.access_token;
    if (token) {
      localStorage.setItem('access_token', token);
      console.info('Dev token injected into localStorage');
    } else {
      console.info('No dev token available');
    }
  } catch (err) {
    // silence in dev
    console.debug('injectDevToken error', err);
  }
}
