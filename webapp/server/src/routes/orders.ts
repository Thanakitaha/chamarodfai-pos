import { Router } from 'express';
import { pool } from '../config/db';

const router = Router();

// ปรับตามร้านของคุณถ้าจำเป็น
const STORE_ID = Number(process.env.STORE_ID ?? 1);

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
  // คุมให้เป็น 2 ตำแหน่ง โดยไม่คืน NaN
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
      AND store_id = $2
      AND active = TRUE
      AND now() >= start_at
      AND now() <= end_at
    LIMIT 1
  `;
  const { rows } = await pool.query(sql, [promotionId, STORE_ID]);
  return rows[0] || null;
}

function calcDiscount(subtotal: number, promo: any): number {
  if (!promo) return 0;

  const minOk =
    promo.min_order_amount == null ||
    subtotal >= Number(promo.min_order_amount);

  if (!minOk) return 0;

  const type = String(promo.discount_type || '').toLowerCase();
  const val = Number(promo.discount_value || 0);

  if (type === 'percent' || type === 'percentage') {
    const d = subtotal * (val / 100);
    return Math.max(0, Math.min(d, subtotal));
  }
  if (type === 'fixed') {
    return Math.max(0, Math.min(val, subtotal));
  }
  return 0;
}

// ---------- POST /api/orders ----------
router.post('/', async (req, res) => {
  const payload = req.body as CreateOrderPayload;

  if (!payload?.items?.length) {
    return res.status(400).json({ success: false, error: 'No items' });
  }

  // เตรียม items ให้สะอาด + คำนวณ line subtotal ตั้งแต่ตรงนี้
  const items = payload.items.map((it) => {
    const price = toNum(it.price, 0);
    const qty = toNum(it.quantity, 0);
    const lineSubtotal = round2(price * qty);
    return {
      menuItemId: toNum(it.menuItemId, 0),
      price: round2(price),
      quantity: qty,
      note: it.note ?? null,
      lineSubtotal,
    };
  });

  const subtotalRaw = items.reduce((s, it) => s + it.lineSubtotal, 0);
  const subtotal = round2(subtotalRaw);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // โหลดโปรฯ (ถ้ามี) แล้วคำนวณส่วนลดจาก subtotal
    const promo = await getPromotion(payload.promotionId ?? null);
    const discount = round2(calcDiscount(subtotal, promo));

    const taxAmount = round2(toNum(payload.taxAmount, 0));
    const serviceCharge = round2(toNum(payload.serviceCharge, 0));

    // กันติดลบโดยรวม
    const total = round2(Math.max(0, subtotal - discount) + taxAmount + serviceCharge);

    // สร้าง order
    const orderIns = await client.query(
      `INSERT INTO pos.orders
         (store_id, subtotal, discount, promotion_id, tax_amount, service_charge, total, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING order_id, order_number`,
      [
        STORE_ID,
        subtotal,
        discount,
        payload.promotionId ?? null,
        taxAmount,
        serviceCharge,
        total,
        payload.status ?? 'paid',
      ]
    );

    const orderId = Number(orderIns.rows[0].order_id);
    const orderNumber = orderIns.rows[0].order_number as string;

    // แทรก order_items โดย "ใส่คอลัมน์ subtotal" อย่างชัดเจน
    for (const it of items) {
      await client.query(
        `INSERT INTO pos.order_items
           (order_id, menu_item_id, quantity, price, subtotal, discount, tax_amount, note)
         VALUES
           ($1,       $2,           $3,       $4,    $5,       $6,       $7,        $8)`,
        [
          orderId,
          it.menuItemId,
          it.quantity,
          it.price,
          it.lineSubtotal, // <<<<<< สำคัญ: ไม่ปล่อยเป็น NULL
          0,               // per-line discount ถ้ายังไม่ใช้ แก้ไขได้ภายหลัง
          0,               // per-line tax ถ้ายังไม่ใช้
          it.note,
        ]
      );
    }

    // ถ้าต้องการ mark paid ทันที
    if ((payload.status ?? 'paid') === 'paid') {
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

// ---------- GET /api/orders/next-number ----------
router.get('/next-number', async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT to_char(now(),'YYYYMMDD')||LPAD((COUNT(*)+1)::text, 4, '0') AS "orderNumber"
     FROM pos.orders
     WHERE created_at::date = current_date`
  );
  res.json({ success: true, data: rows[0] });
});

export default router;
