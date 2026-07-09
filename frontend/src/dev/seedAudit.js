const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

export default async function seedAudit() {
  if (import.meta.env.MODE !== 'development') return;

  try {
    const res = await fetch(`${API_BASE}/api/v1/dev-seed-audit/`);
    const json = await res.json();
    if (json?.created) {
      console.info('Seeded audit logs:', json.created);
    }
  } catch (err) {
    console.debug('seedAudit error', err);
  }
}
