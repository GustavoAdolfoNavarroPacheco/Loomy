import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { sql } from './db.js';

export async function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 15_000_000) req.destroy();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(new Error('JSON inválido'));
      }
    });
    req.on('error', reject);
  });
}

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  const test = scryptSync(password, salt, 64);
  const orig = Buffer.from(hash, 'hex');
  return test.length === orig.length && timingSafeEqual(test, orig);
}

export function getBearerToken(req) {
  const auth = req.headers.authorization || '';
  return auth.startsWith('Bearer ') ? auth.slice(7) : null;
}

export async function getSessionUser(req) {
  const token = getBearerToken(req);
  if (!token) return null;
  const rows = await sql(
    `SELECT u.email, u.modify_local, u.modify_international, u.is_cotizador
     FROM sessions s JOIN users u ON u.email = s.email
     WHERE s.token = $1 AND s.expires_at > now()`,
    [token]
  );
  return rows[0] || null;
}

export function serializeUser(u) {
  return {
    email: u.email,
    modifyLocal: !!u.modify_local,
    modifyInternational: !!u.modify_international,
    isCotizador: !!u.is_cotizador,
  };
}
