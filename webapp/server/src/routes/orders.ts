import { Router } from 'express';
import { pool } from '../config/db';

const router = Router();

type CreateOrderItemPayload = {
  menuItemId: number;
  price: number;
  quantity: number;
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
  // คุมให้เป็น 2 ตำแหน่ง โดยไม่คืน NaN
  return Math.round((v + Number.EPSILON) * 100) / 100;
}

async function getPromotion(promotionId: number) {
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
  const minAmt = toNum(promo.min_order_amount, 0);
  if (subtotal < minAmt) return 0;

  const typ = String(promo.discount_type) as 'percent' | 'fixed';
  const val = toNum(promo.discount_value, 0);

  if (typ === 'percent') {
    return round2((subtotal * val) / 100);
  }
  return round2(Math.min(val, subtotal));
}

// ---------- GET /api/orders ----------
router.get('/', async (_req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT o.*, p.name AS promotion_name
      FROM pos.orders o
      LEFT JOIN pos.promotions p ON p.promotion_id = o.promotion_id
      ORDER BY o.created_at DESC
      LIMIT 200
    `);
    res.json({ success: true, data: rows });
  } catch (e) { next(e); }
});

// ---------- GET /api/orders/next-number ----------
router.get('/next-number', async (_req, res, next) => {
  try {
    res.json({ success: true, data: { orderNumber: 'AUTO' } });
  } catch (e) { next(e); }
});

// ---------- POST /api/orders ----------
router.post('/', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const body: CreateOrderPayload = (req.body || {}) as any;
    const items = Array.isArray(body.items) ? body.items : [];

    if (items.length === 0) {
      return res.status(400).json({ success: false, error: 'no_items' });
    }

    // validate & normalize items
    const itemRows = items.map((raw, idx) => {
      const menuItemId = toNum(raw.menuItemId, NaN);
      const price = round2(raw.price);
      const quantity = round2(raw.quantity); // รองรับ .5 แก้ว, แต่คุณมี CHECK > 0 อยู่แล้ว

      if (!Number.isFinite(menuItemId)) {
        throw new Error(`invalid_item_${idx}_menuItemId`);
      }
      if (!Number.isFinite(price) || price < 0) {
        throw new Error(`invalid_item_${idx}_price`);
      }
      if (!Number.isFinite(quantity) || quantity <= 0) {
        throw new Error(`invalid_item_${idx}_quantity`);
      }

      const itemSubtotal = round2(price * quantity);
      if (!Number.isFinite(itemSubtotal) || itemSubtotal < 0) {
        throw new Error(`invalid_item_${idx}_subtotal`);
      }

      return { menuItemId, price, quantity, itemSubtotal };
    });

    const taxAmount = round2(body.taxAmount ?? 0);
    const serviceCharge = round2(body.serviceCharge ?? 0);
    const status: 'open' | 'paid' = body.status === 'paid' ? 'paid' : 'open';

    const orderSubtotal = round2(itemRows.reduce((s, x) => s + x.itemSubtotal, 0));

    // promotion
    let promoRow: any = null;
    if (body.promotionId != null && Number.isFinite(Number(body.promotionId))) {
      promoRow = await getPromotion(Number(body.promotionId));
    }
    const orderDiscount = round2(calcDiscount(orderSubtotal, promoRow));
    const orderTotal = round2(orderSubtotal - orderDiscount + taxAmount + serviceCharge);
    if (!Number.isFinite(orderTotal) || orderTotal < 0) {
      return res.status(400).json({ success: false, error: 'invalid_total' });
    }

    await client.query('BEGIN');

    const insertOrderSql = `
      INSERT INTO pos.orders
        (store_id, customer_id, cashier_id,
         subtotal, discount, promotion_id,
         tax_amount, service_charge, total,
         status, note)
      VALUES
        ($1,       NULL,       NULL,
         $2,       $3,         $4,
         $5,       $6,         $7,
         $8,       NULL)
      RETURNING *
    `;
    const orderParams = [
      1,
      orderSubtotal,
      orderDiscount,
      promoRow ? promoRow.promotion_id : null,
      taxAmount,
      serviceCharge,
      orderTotal,
      status,
    ];
    const { rows: orderRows } = await client.query(insertOrderSql, orderParams);
    const order = orderRows[0];

    // insert items (LOG params กันเหนียว)
    const insertItemSql = `
      INSERT INTO pos.order_items
        (order_id, menu_item_id, quantity, price, discount, tax_amount, subtotal, note)
      VALUES
        ($1,       $2,          $3,       $4,    $5,       $6,         $7,       NULL)
      RETURNING *
    `;

    const insertedItems = [];
    for (const r of itemRows) {
      const params = [
        order.order_id,
        r.menuItemId,
        r.quantity,
        r.price,
        0,
        0,
        r.itemSubtotal, // ✅ ต้องเป็นตัวเลข (ไม่ใช่ null/NaN)
      ];

      // debug log — จะเห็นทันทีถ้าเป็น null/NaN
      console.log('[order_items.insert.params]', params);

      // ป้องกันซ้ำชั้น
      if (!Number.isFinite(toNum(r.itemSubtotal, NaN))) {
        throw new Error('item_subtotal_nan');
      }

      const { rows } = await client.query(insertItemSql, params);
      insertedItems.push(rows[0]);
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      data: {
        order: { ...order, items: insertedItems },
      },
    });
  } catch (e: any) {
    try { await (await pool.connect()).query('ROLLBACK'); } catch {}
    // ใช้ ROLLBACK กับ client ที่เปิดไว้
    try { await (await pool.connect()).release(); } catch {}
    // ส่งรายละเอียด error กลับให้เห็นง่ายขึ้นระหว่างดีบัก
    console.error('[orders.create.error]', e?.message, e);
    (res as any).status?.(500)?.json?.({
      success: false,
      error: 'Internal error',
      detail: String(e?.message ?? e),
    }) ?? next(e);
  }
});

export default router;
