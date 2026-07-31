import { sql } from '../_lib/db.js';
import { getSessionUser } from '../_lib/auth.js';

// GET    /api/files/:id → descargar archivo (público, usado en <a>/window.open)
// DELETE /api/files/:id → eliminar archivo
export default async function handler(req, res) {
  const { id } = req.query;
  if (!id) {
    res.status(400).json({ error: 'Id requerido' });
    return;
  }

  if (req.method === 'GET') {
    const rows = await sql('SELECT name, mime, data FROM files WHERE id = $1', [String(id)]);
    const file = rows[0];
    if (!file) {
      res.status(404).json({ error: 'No encontrado' });
      return;
    }
    const buf = Buffer.from(file.data, 'base64');
    res.setHeader('Content-Type', file.mime || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${file.name || 'archivo'}"`);
    res.setHeader('Content-Length', buf.length);
    res.end(buf);
    return;
  }

  if (req.method === 'DELETE') {
    const user = await getSessionUser(req);
    if (!user) {
      res.status(401).json({ error: 'No autorizado' });
      return;
    }
    await sql('DELETE FROM files WHERE id = $1', [String(id)]);
    res.status(200).json({ ok: true });
    return;
  }

  res.status(405).json({ error: 'Método no permitido' });
}
