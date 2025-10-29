// src/index.ts
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';

import { pool } from './config/db';
import menu from './routes/menu';
import orders from './routes/orders';
import promotions from './routes/promotions';
import reports from './routes/reports';

const PORT = Number(process.env.PORT || 3001);
const app = express();

// ---------- Middlewares ----------
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// ---------- Helpers ----------
async function ping() {
  // คืนข้อมูลสถานะ DB แบบอ่านง่าย ใช้สิทธิ์ปกติได้
  const { rows } = await pool.query<{
    current_database: string;
    current_user: string;
    server_addr: string | null;
    server_port: number | null;
    now: string;
    ver: string;
    ssl: string;
  }>(`
    SELECT
      current_database() AS current_database,
      current_user AS current_user,
      inet_server_addr()::text AS server_addr,
      inet_server_port() AS server_port,
      now()::text AS now,
      version() AS ver,
      current_setting('ssl', true) AS ssl
  `);
  return rows[0];
}

// ---------- Root info ----------
app.get('/api', (_req, res) => {
  res.json({
    success: true,
    endpoints: {
      health: "/api/health",
      dbInfo: "/api/db/info",
      // คง route เดิมเพื่อความเข้ากันได้
      sheetsInfo: "/api/sheets/info",
      menuItems: {
        list: "GET /api/menu-items",
        create: "POST /api/menu-items",
        update: "PUT /api/menu-items/:id",
        delete: "DELETE /api/menu-items/:id"
      },
      promotions: "GET /api/promotions",
      orders: {
        list: "GET /api/orders",
        create: "POST /api/orders",
        nextNumber: "GET /api/orders/next-number"
      },
      reports: {
        sales: "GET /api/reports/sales?from=YYYY-MM-DD&to=YYYY-MM-DD",
        topMenu: "GET /api/reports/top-menu?limit=10"
      }
    }
  });
});

// ---------- Health ----------
app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, time: new Date().toISOString() });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || 'db_error' });
  }
});

// ---------- DB info ----------
app.get('/api/db/info', async (_req, res, next) => {
  try {
    const info = await ping();
    res.json({ success: true, data: info });
  } catch (e) { next(e); }
});

// (Backward compat) เดิม client เคยเรียก /api/sheets/info → ให้ตอบกลับว่าใช้ Postgres แล้ว
app.get('/api/sheets/info', async (_req, res, next) => {
  try {
    const info = await ping();
    res.json({
      success: true,
      data: {
        message: 'Using PostgreSQL instead of Google Sheets',
        database: info?.current_database ?? process.env.DB_NAME ?? 'chamarodfai'
      }
    });
  } catch (e) { next(e); }
});

// ---------- Routes ----------
app.use('/api/menu-items', menu);
app.use('/api/orders', orders);
app.use('/api/promotions', promotions);
app.use('/api/reports', reports);

// ---------- 404 ----------
app.use('*', (_req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// ---------- Error handler ----------
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error(err);
  res.status(500).json({ success: false, error: 'Internal error', detail: String(err?.message ?? err) });
});

// ---------- Start / Graceful shutdown ----------
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 API endpoints available at http://localhost:${PORT}/api`);
});

const shutdown = async () => {
  try {
    await pool.end();
  } finally {
    server.close(() => process.exit(0));
  }
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
