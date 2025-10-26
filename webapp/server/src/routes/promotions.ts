// src/routes/promotions.ts
import { Router } from 'express';
import * as svc from '../services/promotion.service';

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    const promotions = await svc.listPromotions(true);
    res.json({ success: true, data: promotions });
  } catch (e) { next(e); }
});

export default router;
