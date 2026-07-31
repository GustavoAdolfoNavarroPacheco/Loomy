import { sql } from '../_lib/db.js';
import { getBearerToken } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }
  const token = getBearerToken(req);
  if (token) {
    await sql('DELETE FROM sessions WHERE token = $1', [token]);
  }
  res.status(200).json({ ok: true });
}
