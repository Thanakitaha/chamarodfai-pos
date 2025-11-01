import { Router } from 'express';
import { pool } from '../config/db';

const router = Router();

type CreateOrderItemPayload = {
  menuItemId: number;
  price: number;
  quantity: number;
  note?: string | null;
};

type CreateOrderPayload = {
  items: CreateOrderItemPayload[];
  promotionId?: number | null;
  taxAmount?: number;
  serviceCharge?: number;
  status: 'open' | 'paid';
};

// --- utils ---
function toNum(n: any, fallback = 0): number {
  const v = Number(n);
  return Number.isFinite(v) ? v : fallback;
}
function round2(n: any): number {
  const v = toNum(n, NaN);
  if (!Number.isFinite(v)) return 0;
  return Math.round((v + Number.EPSILON) * 100) / 100;
}

async function getPromotion(promotionId: number | null) {
  if (!promotionId) return null;
  const sql = `
    SELECT promotion_id, store_id, name, description,
           discount_type, discount_value, min_order_amount,
           start_at, end_at, active
    FROM pos.promotions
    WHERE promotion_id = $1
      AND active = TRUE
      AND now() >= start_at
      AND now() <= end_at
    LIMIT 1
  `;
  const { rows } = await pool.query(sql, [promotionId]);
  return rows[0] || null;
}

function calcDiscount(subtotal: number, promo: any): number {
  if (!promo) return 0;
  const minOk =
    promo.min_order_amount == null || subtotal >= Number(promo.min_order_amount);
  if (!minOk) return 0;

  const type = String(promo.discount_type || '').toLowerCase();
  const val = Number(promo.discount_value || 0);

  if (type === 'percent' || type === 'percentage') {
    return Math.max(0, round2(subtotal * (val / 100)));
  }
  if (type === 'fixed') {
    return Math.min(subtotal, Math.max(0, round2(val)));
  }
  return 0;
}

// ---------- POST /api/orders ----------
router.post('/', async (req, res) => {
  const payload = req.body as CreateOrderPayload;

  if (!payload?.items?.length) {
    return res.status(400).json({ success: false, error: 'No items' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1) คิดยอดรวมจาก payload
    const cleanItems = payload.items.map((it) => ({
      menuItemId: toNum(it.menuItemId),
      price: round2(it.price),
      quantity: round2(it.quantity),
      note: it.note ?? null,
    }));

    const rawSubtotal = cleanItems.reduce(
      (s, it) => s + toNum(it.price) * toNum(it.quantity),
      0
    );
    const subtotal = round2(rawSubtotal);

    const promo = await getPromotion(payload.promotionId ?? null);
    const discount = round2(calcDiscount(subtotal, promo));
    const taxAmount = round2(payload.taxAmount ?? 0);
    const serviceCharge = round2(payload.serviceCharge ?? 0);
    const total = round2(subtotal - discount + taxAmount + serviceCharge);
    const status = (payload.status ?? 'paid') as 'open' | 'paid';

    // 2) INSERT orders
    const orderIns = await client.query(
      `INSERT INTO pos.orders
         (store_id, subtotal, discount, promotion_id, tax_amount, service_charge, total, status)
       VALUES (1, $1, $2, $3, $4, $5, $6, $7)
       RETURNING order_id, order_number`,
      [subtotal, discount, payload.promotionId ?? null, taxAmount, serviceCharge, total, status]
    );

    const orderId = Number(orderIns.rows[0].order_id);
    const orderNumber = String(orderIns.rows[0].order_number);

    // 3) INSERT order_items (ใส่ subtotal และ cost_at_sale = 0)
    for (const it of cleanItems) {
      const itemSubtotal = round2(toNum(it.price) * toNum(it.quantity));
      await client.query(
        `INSERT INTO pos.order_items
           (order_id, menu_item_id, quantity, price, discount, tax_amount, subtotal, cost_at_sale, note)
         VALUES ($1, $2, $3, $4, 0, 0, $5, 0, $6)`,
        [orderId, it.menuItemId, it.quantity, it.price, itemSubtotal, it.note]
      );
    }

    // 4) สถานะ paid ก็ย้ำอีกครั้ง (DB trigger/logic อื่น ๆ จะทำงาน)
    if (status === 'paid') {
      await client.query(`UPDATE pos.orders SET status='paid' WHERE order_id=$1`, [orderId]);
    }

    await client.query('COMMIT');
    return res.json({ success: true, data: { id: orderId, orderNumber } });
  } catch (e: any) {
    await client.query('ROLLBACK');
    console.error(e);
    return res.status(500).json({ success: false, error: e?.message || 'Internal error' });
  } finally {
    client.release();
  }
});

// ---------- GET /api/orders ----------
router.get('/', async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT order_id AS id, order_number AS "orderNumber",
            subtotal, discount, promotion_id AS "promotionId",
            tax_amount AS "taxAmount", service_charge AS "serviceCharge",
            total, status, created_at AS "createdAt"
     FROM pos.orders
     ORDER BY created_at DESC`
  );
  res.json({ success: true, data: rows });
});

router.get('/next-number', async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT to_char(now(),'YYYYMMDD')||LPAD((COUNT(*)+1)::text, 4, '0') AS "orderNumber"
     FROM pos.orders
     WHERE created_at::date = current_date`
  );
  res.json({ success: true, data: rows[0] });
});

export default router;
