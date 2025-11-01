import { Router } from 'express';
import * as svc from '../services/reports.service';

const router = Router();

router.get('/sales', async (req, res, next) => {
  try {
    const { from, to, period, date } = req.query as any;
    if (period === 'daily' && date) {
      const data = await svc.salesReportDaily(String(date));
      // Always return a well-formed object
      return res.json({ success: true, data });
    }
    const data = await svc.salesDaily(from as any, to as any);
    return res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
});

router.get('/trend', async (req, res, next) => {
  try {
    const days = Math.max(1, Math.min(31, Number((req.query as any).days ?? 7)));
    const data = await svc.salesTrend(days);
    return res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
});

export default router;
