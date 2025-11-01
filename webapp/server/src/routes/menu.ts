// src/routes/menu.ts
import { Router } from 'express';
import * as svc from '../services/menu.service';

const router = Router();

// GET /api/menu-items
router.get('/', async (_req, res, next) => {
  try {
    const items = await svc.listMenuItems();
    res.json({ success: true, data: items });
  } catch (e) {
    next(e);
  }
});

// POST /api/menu-items
router.post('/', async (req, res, next) => {
  try {
    // รองรับ payload จากเว็บเก่า: { name, price, cost?, description?, image?, categoryId?, available? }
    // ถ้าหน้าใหม่ส่งมาเป็นชื่อ key เดิมอยู่แล้ว ไม่ต้อง normalize
    const saved = await svc.createMenuItem(req.body);
    res.status(201).json({ success: true, data: saved });
  } catch (e) {
    next(e);
  }
});

// PUT /api/menu-items/:id
router.put('/:id', async (req, res, next) => {
  try {
    const saved = await svc.updateMenuItem(Number(req.params.id), req.body);
    if (!saved) return res.status(404).json({ success: false, error: 'Menu item not found' });
    res.json({ success: true, data: saved });
  } catch (e) {
    next(e);
  }
});

// DELETE /api/menu-items/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const ok = await svc.deleteMenuItem(Number(req.params.id));
    if (!ok) return res.status(404).json({ success: false, error: 'Menu item not found' });
    res.json({ success: true, message: 'Menu item deleted successfully' });
  } catch (e) {
    next(e);
  }
});

export default router;
