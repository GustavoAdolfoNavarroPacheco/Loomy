import { randomUUID } from 'node:crypto';
import { sql } from '../_lib/db.js';
import { getSessionUser, readBody } from '../_lib/auth.js';

// GET /api/collections/:name?order=createdAt  → list items
// POST /api/collections/:name                → add item (returns { id })
// DELETE /api/collections/:name              → clear collection
export default async function handler(req, res) {
  const user = await getSessionUser(req);
  if (!user) {
    res.status(401).json({ error: 'No autorizado' });
    return;
  }

  const { name } = req.query;
  if (!name) {
    res.status(400).json({ error: 'Nombre de colección requerido' });
    return;
  }

  const collection = String(name);

  if (req.method === 'GET') {
    const orderField = req.query.order === 'createdAt' ? 'createdAt' : null;
    let rows;
    if (orderField) {
      rows = await sql(
        `SELECT id, data FROM documents
         WHERE collection = $1
         ORDER BY (data->>'createdAt') DESC NULLS LAST`,
        [collection]
      );
    } else {
      rows = await sql(
        `SELECT id, data FROM documents
         WHERE collection = $1
         ORDER BY created_at DESC`,
        [collection]
      );
    }
    res.status(200).json(rows.map((r) => ({ id: r.id, ...r.data })));
    return;
  }

  if (req.method === 'POST') {
    const body = await readBody(req).catch(() => ({}));
    const id = body.id || randomUUID();
    const data = { ...body };
    delete data.id;
    if (!data.createdAt) data.createdAt = new Date().toISOString();
    await sql(
      `INSERT INTO documents (collection, id, data)
       VALUES ($1, $2, $3)
       ON CONFLICT (collection, id) DO UPDATE SET data = EXCLUDED.data`,
      [collection, id, JSON.stringify(data)]
    );
    res.status(201).json({ id });
    return;
  }

  if (req.method === 'DELETE') {
    await sql('DELETE FROM documents WHERE collection = $1', [collection]);
    res.status(200).json({ ok: true });
    return;
  }

  res.status(405).json({ error: 'Método no permitido' });
}
