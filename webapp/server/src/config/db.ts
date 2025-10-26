// server/src/config/db.ts
import { Pool } from 'pg';
import 'dotenv/config';

export const pool = new Pool({
  host: process.env.DB_HOST ?? '127.0.0.1',
  port: Number(process.env.DB_PORT ?? 5432),
  database: process.env.DB_NAME ?? 'chamarodfai',
  user: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'chamarodfai101',
  max: 10, // ปรับตามสภาพแวดล้อม
  idleTimeoutMillis: 10_000,
});

export async function ping() {
  const r = await pool.query(`select now() as now, current_database() as db`);
  return r.rows[0];
}
