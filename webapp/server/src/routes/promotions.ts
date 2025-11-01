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
    const id = await svc.createPromotion({
      name: req.body.name,
      description: req.body.description ?? null,
      discountType: req.body.discountType,
      discountValue: Number(req.body.discountValue ?? 0),
      minOrderAmount: req.body.minOrderAmount ?? null,
      startDate: req.body.startDate,
      endDate: req.body.endDate,
      active: Boolean(req.body.active ?? true),
    });
    res.json({ success: true, data: { id } });
  } catch (e) { next(e); }
});

// PUT /api/promotions/:id
router.put('/:id', async (req, res, next) => {
  try {
    const ok = await svc.updatePromotion(Number(req.params.id), {
      name: req.body.name,
      description: req.body.description ?? null,
      discountType: req.body.discountType,
      discountValue: Number(req.body.discountValue ?? 0),
      minOrderAmount: req.body.minOrderAmount ?? null,
      startDate: req.body.startDate,
      endDate: req.body.endDate,
      active: Boolean(req.body.active ?? true),
    });
    if (!ok) return res.status(404).json({ success: false, error: 'Promotion not found' });
    res.json({ success: true, message: 'Updated' });
  } catch (e) { next(e); }
});

// DELETE /api/promotions/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const ok = await svc.deletePromotion(Number(req.params.id));
    if (!ok) return res.status(404).json({ success: false, error: 'Promotion not found' });
    res.json({ success: true, message: 'Deleted' });
  } catch (e) { next(e); }
});

// PATCH /api/promotions/:id/toggle  (ของเดิม)
router.patch('/:id/toggle', async (req, res, next) => {
  try {
    const active = await svc.togglePromotion(Number(req.params.id));
    if (active === null) return res.status(404).json({ success:false, error:'Promotion not found' });
    res.json({ success: true, data: { active } });
  } catch (e) { next(e); }
});

// ✅ เพิ่ม POST ให้รองรับ client ที่เรียก POST
router.post('/:id/toggle', async (req, res, next) => {
  try {
    const active = await svc.togglePromotion(Number(req.params.id));
    if (active === null) return res.status(404).json({ success:false, error:'Promotion not found' });
    res.json({ success: true, data: { active } });
  } catch (e) { next(e); }
});

export default router;
