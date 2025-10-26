// src/index.ts
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';

import { ping } from './config/db';
import menu from './routes/menu';
import orders from './routes/orders';
import promotions from './routes/promotions';
import reports from './routes/reports';

const PORT = Number(process.env.PORT || 3001);
const app = express();

// middlewares
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));

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

// health
app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: 'Server is running' });
});

// DB info
app.get('/api/db/info', async (_req, res, next) => {
  try { res.json({ success:true, data: await ping() }); }
  catch (e) { next(e); }
});

// (Backward compat) เดิม client เคยเรียก /api/sheets/info → ให้ตอบกลับว่าใช้ Postgres แล้ว
app.get('/api/sheets/info', (_req, res) => {
  res.json({
    success: true,
    data: {
      message: 'Using PostgreSQL instead of Google Sheets',
      database: process.env.DB_NAME ?? 'chamarodfai'
    }
  });
});

// routes
app.use('/api/menu-items', menu);
app.use('/api/orders', orders);
app.use('/api/promotions', promotions);
app.use('/api/reports', reports);

// 404
app.use('*', (_req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// error handler
app.use((err:any,_req:any,res:any,_next:any)=>{
  console.error(err);
  res.status(500).json({ success:false, error:'Internal error', detail: String(err?.message ?? err) });
});

// start
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 API endpoints available at http://localhost:${PORT}/api`);
});
