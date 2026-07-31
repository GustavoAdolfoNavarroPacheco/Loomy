import { getSessionUser, serializeUser } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }
  const user = await getSessionUser(req);
  if (!user) {
    res.status(401).json({ error: 'No autorizado' });
    return;
  }
  res.status(200).json({ user: serializeUser(user) });
}
