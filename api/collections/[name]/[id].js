import { sql } from '../../_lib/db.js';
import { getSessionUser, readBody } from '../../_lib/auth.js';

// PUT    /api/collections/:name/:id → merge update (upsert)
// DELETE /api/collections/:name/:id → remove item
export default async function handler(req, res) {
  const user = await getSessionUser(req);
  if (!user) {
    res.status(401).json({ error: 'No autorizado' });
    return;
  }

  const { name, id } = req.query;
  if (!name || !id) {
    res.status(400).json({ error: 'Colección e id requeridos' });
    return;
  }

  const collection = String(name);
  const docId = String(id);

  if (req.method === 'PUT') {
    const body = await readBody(req).catch(() => ({}));
    const existing = await sql(
      'SELECT data FROM documents WHERE collection = $1 AND id = $2',
      [collection, docId]
    );
    const merged = existing[0] ? { ...existing[0].data, ...body } : { ...body };
    await sql(
      `INSERT INTO documents (collection, id, data)
       VALUES ($1, $2, $3)
       ON CONFLICT (collection, id) DO UPDATE SET data = EXCLUDED.data`,
      [collection, docId, JSON.stringify(merged)]
    );
    res.status(200).json({ ok: true });
    return;
  }

  if (req.method === 'DELETE') {
    await sql('DELETE FROM documents WHERE collection = $1 AND id = $2', [collection, docId]);
    res.status(200).json({ ok: true });
    return;
  }

  res.status(405).json({ error: 'Método no permitido' });
}
