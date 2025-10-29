// server/src/config/db.ts
import { Pool } from 'pg';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is required');
}

export const pool = new Pool({
  connectionString,
  max: 10,
  idleTimeoutMillis: 10_000,
});

export async function ping() {
  const r = await pool.query(`select now() as now, current_database() as db`);
  return r.rows[0];
}
