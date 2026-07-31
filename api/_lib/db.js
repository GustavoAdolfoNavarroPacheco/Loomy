import { neon } from '@neondatabase/serverless';

// Cliente HTTP serverless de Neon (sin pool ni conexiones persistentes)
export const sql = neon(process.env.DATABASE_URL);
