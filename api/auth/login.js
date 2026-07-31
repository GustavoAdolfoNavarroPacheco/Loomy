import { randomBytes } from 'node:crypto';
import { sql } from '../_lib/db.js';
import { readBody, verifyPassword, serializeUser } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }

  const body = await readBody(req).catch(() => ({}));
  const email = String(body.email || '').toLowerCase().trim();
  const password = String(body.password || '');

  if (!email || !password) {
    res.status(400).json({ error: 'Correo y contraseña requeridos' });
    return;
  }

  const rows = await sql('SELECT * FROM users WHERE email = $1', [email]);
  const user = rows[0];
  if (!user || !verifyPassword(password, user.password_hash)) {
    res.status(401).json({ error: 'Credenciales inválidas' });
    return;
  }

  const token = randomBytes(32).toString('hex');
  await sql(
    `INSERT INTO sessions (token, email, expires_at)
     VALUES ($1, $2, now() + interval '30 days')`,
    [token, user.email]
  );

  res.status(200).json({ token, user: serializeUser(user) });
}
