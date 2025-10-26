// src/routes/reports.ts
import { Router } from 'express';
import * as svc from '../services/reports.service';

const router = Router();

router.get('/sales', async (req, res, next) => {
  try {
    const { from, to } = req.query as any;
    const data = await svc.salesDaily(from, to);
    res.json({ success: true, data });
  } catch (e) { next(e); }
});

router.get('/top-menu', async (req, res, next) => {
  try {
    const limit = Number(req.query.limit ?? 10);
    const data = await svc.topMenu(limit);
    res.json({ success: true, data });
  } catch (e) { next(e); }
});

export default router;
