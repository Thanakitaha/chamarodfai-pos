import { Router } from 'express';
import { pool } from '../config/db';

const router = Router();

async function fetchMenuItems() {
  const { rows } = await pool.query(
    `SELECT
       menu_item_id AS id,
       name,
       price,
       category_id,
       image_url AS image
     FROM pos.menu_items
     WHERE available = TRUE`
  );
  return rows;
}

router.get('/menu-items', async (_req, res) => {
  try {
    const items = await fetchMenuItems();
    res.json({ success: true, data: items });
  } catch (e: any) {
    console.error('[menu-items] error:', e?.message || e);
    res.status(500).json({ success: false, error: 'Failed to fetch menu items' });
  }
});

export default router;
