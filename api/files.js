import { randomUUID } from 'node:crypto';
import { sql } from '../_lib/db.js';
import { getSessionUser, readBody } from '../_lib/auth.js';

// POST /api/files → guardar archivo (base64) → { url: "/api/files/:id" }
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
  const base64 = String(body.base64 || '');
  if (!base64) {
    res.status(400).json({ error: 'Contenido del archivo requerido' });
    return;
  }

  const id = randomUUID();
  const name = String(body.name || 'archivo');
  const mime = String(body.mime || 'application/octet-stream');

  // Guardamos el base64 como TEXT: el driver HTTP de Neon no serializa Buffers.
  await sql(
    'INSERT INTO files (id, name, mime, data) VALUES ($1, $2, $3, $4)',
    [id, name, mime, base64]
  );

  res.status(201).json({ id, url: `/api/files/${id}` });
}
