// src/routes/promotions.ts
import { Router } from 'express';
import * as svc from '../services/promotion.service';

const router = Router();

// GET /api/promotions?onlyActive=true
router.get('/', async (req, res, next) => {
  try {
    const onlyActive = req.query.onlyActive !== 'false';
    const promotions = await svc.listPromotions(onlyActive);
    res.json({ success: true, data: promotions });
  } catch (e) { next(e); }
});

// POST /api/promotions
router.post('/', async (req, res, next) => {
  try {
    const created = await svc.createPromotion(req.body);
    res.status(201).json({ success: true, data: created });
  } catch (e: any) {
    res.status(400).json({ success: false, error: e.message || 'Invalid payload' });
  }
});

// PUT /api/promotions/:id
router.put('/:id', async (req, res, next) => {
  try {
    const ok = await svc.updatePromotion(Number(req.params.id), req.body);
    if (!ok) return res.status(404).json({ success:false, error:'Promotion not found' });
    res.json({ success: true, message: 'Updated' });
  } catch (e: any) {
    res.status(400).json({ success: false, error: e.message || 'Invalid payload' });
  }
});

// DELETE /api/promotions/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const ok = await svc.deletePromotion(Number(req.params.id));
    if (!ok) return res.status(404).json({ success:false, error:'Promotion not found' });
    res.json({ success: true, message: 'Deleted' });
  } catch (e) { next(e); }
});

// PATCH /api/promotions/:id/toggle
router.patch('/:id/toggle', async (req, res, next) => {
  try {
    const active = await svc.togglePromotion(Number(req.params.id));
    if (active === null) return res.status(404).json({ success:false, error:'Promotion not found' });
    res.json({ success: true, data: { active } });
  } catch (e) { next(e); }
});

export default router;
