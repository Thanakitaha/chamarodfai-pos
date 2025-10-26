// src/routes/orders.ts
import { Router } from 'express';
import * as svc from '../services/orders.service';

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    const orders = await svc.listOrders();
    res.json({ success: true, data: orders });
  } catch (e) { next(e); }
});

router.get('/next-number', async (_req, res, next) => {
  try {
    const orderNumber = await svc.getNextOrderNumber();
    res.json({ success: true, data: { orderNumber } });
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const created = await svc.createOrder(req.body);
    res.status(201).json({ success: true, data: created });
  } catch (e) { next(e); }
});

export default router;
