import { sql } from '../_lib/db.js';
import { getSessionUser, readBody, hashPassword } from '../_lib/auth.js';

// POST /api/users → crear usuario con permisos (se usa desde Configuración)
export default async function handler(req, res) {
  const user = await getSessionUser(req);
  if (!user) {
    res.status(401).json({ error: 'No autorizado' });
    return;
  }

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

  await sql(
    `INSERT INTO users (email, password_hash, modify_local, modify_international, is_cotizador)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (email) DO UPDATE SET
       password_hash = EXCLUDED.password_hash,
       modify_local = EXCLUDED.modify_local,
       modify_international = EXCLUDED.modify_international,
       is_cotizador = EXCLUDED.is_cotizador`,
    [email, hashPassword(password), !!body.modifyLocal, !!body.modifyInternational, !!body.isCotizador]
  );

  res.status(201).json({ ok: true, email });
}
