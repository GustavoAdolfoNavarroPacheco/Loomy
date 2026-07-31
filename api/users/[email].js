import { sql } from '../_lib/db.js';
import { getSessionUser, readBody } from '../_lib/auth.js';

// PUT    /api/users/:email → actualizar permisos
// DELETE /api/users/:email → eliminar usuario (y sus sesiones)
export default async function handler(req, res) {
  const user = await getSessionUser(req);
  if (!user) {
    res.status(401).json({ error: 'No autorizado' });
    return;
  }

  const { email } = req.query;
  if (!email) {
    res.status(400).json({ error: 'Email requerido' });
    return;
  }

  if (req.method === 'PUT') {
    const body = await readBody(req).catch(() => ({}));
    await sql(
      `UPDATE users SET
         modify_local = $1,
         modify_international = $2,
         is_cotizador = $3
       WHERE email = $4`,
      [!!body.modifyLocal, !!body.modifyInternational, !!body.isCotizador, String(email)]
    );
    res.status(200).json({ ok: true });
    return;
  }

  if (req.method === 'DELETE') {
    // sessions se borran en cascada (FK)
    await sql('DELETE FROM users WHERE email = $1', [String(email)]);
    res.status(200).json({ ok: true });
    return;
  }

  res.status(405).json({ error: 'Método no permitido' });
}
