import { Router } from 'express';
import { pool } from '../config/db';

const router = Router();

type CreateOrderItemPayload = {
  menuItemId: number;
  price: number;          // ราคาต่อชิ้น (รวมท็อปปิ้ง/ตัวเลือกแล้ว ถ้ามี)
  quantity: number;
  note?: string | null;   // เก็บรายละเอียด sweetness/toppings เป็น JSON string
};

type CreateOrderPayload = {
  items: CreateOrderItemPayload[];
  promotionId?: number | null;
  taxAmount?: number;
  serviceCharge?: number;
  status: 'open' | 'paid';
};

// -------- utils ----------
const toNum = (n: any, fb = 0) => {
  const v = Number(n);
  return Number.isFinite(v) ? v : fb;
};
const round2 = (n: any) => Math.round((toNum(n) + Number.EPSILON) * 100) / 100;

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
  const t = String(promo.discount_type || '').toLowerCase();
  const v = Number(promo.discount_value || 0);
  if (t === 'percent' || t === 'percentage') return Math.max(0, subtotal * (v / 100));
  if (t === 'fixed') return Math.min(subtotal, Math.max(0, v));
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

    // 1) คิดยอดรวม (เฉพาะสินค้าก่อนส่วนลด)
    const items = payload.items.map(it => ({
      menuItemId: toNum(it.menuItemId),
      price: round2(it.price),
      quantity: round2(it.quantity),
      note: it.note ?? null,
    }));
    const subtotal = round2(items.reduce((s, it) => s + it.price * it.quantity, 0));

    // 2) โหลดโปร (ถ้ามี) + คิดส่วนลด
    const promo = await getPromotion(payload.promotionId ?? null);
    const discount = round2(calcDiscount(subtotal, promo));

    // 3) คิดยอดสุทธิ
    const taxAmount = round2(payload.taxAmount ?? 0);
    const serviceCharge = round2(payload.serviceCharge ?? 0);
    const total = round2(subtotal - discount + taxAmount + serviceCharge);

    // 4) สร้าง orders
    const orderIns = await client.query(
      `INSERT INTO pos.orders
         (store_id, subtotal, discount, promotion_id, tax_amount, service_charge, total, status)
       VALUES
         (1, $1, $2, $3, $4, $5, $6, $7)
       RETURNING order_id, order_number`,
      [
        subtotal,
        discount,
        payload.promotionId ?? null,
        taxAmount,
        serviceCharge,
        total,
        payload.status ?? 'paid',
      ],
    );
    const orderId = Number(orderIns.rows[0].order_id);
    const orderNumber = orderIns.rows[0].order_number as string;

    // 5) ใส่รายการ order_items (⭐️ ต้องมี subtotal และ cost_at_sale)
    //    ดึง cost ล่าสุดจากตารางเมนู (fallback = 0)
    for (const it of items) {
      const { rows: menuRows } = await client.query(
        `SELECT cost FROM pos.menu_items WHERE menu_item_id = $1 LIMIT 1`,
        [it.menuItemId],
      );
      const cost_at_sale = round2(menuRows[0]?.cost ?? 0);
      const line_subtotal = round2(it.price * it.quantity); // ส่วนลดโปรคิดระดับออร์เดอร์ ไม่กระจายรายบรรทัด

      await client.query(
        `INSERT INTO pos.order_items
           (order_id, menu_item_id, quantity, price, discount, tax_amount, subtotal, cost_at_sale, note)
         VALUES
           ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          orderId,
          it.menuItemId,
          it.quantity,
          it.price,
          0,              // discount ต่อบรรทัด = 0 (โปรคิดรวมที่ orders.discount)
          0,              // tax ต่อบรรทัด (รวมไว้ที่ orders.tax_amount)
          line_subtotal,  // ⭐️ จำเป็น: NOT NULL
          cost_at_sale,   // ⭐️ จำเป็น: NOT NULL (มี DEFAULT 0 ก็ได้ แต่เราบันทึกราคาทุนให้)
          it.note ?? null,
        ],
      );
    }

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
     ORDER BY created_at DESC`,
  );
  res.json({ success: true, data: rows });
});

router.get('/next-number', async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT to_char(now(),'YYYYMMDD')||LPAD((COUNT(*)+1)::text, 4, '0') AS "orderNumber"
     FROM pos.orders
     WHERE created_at::date = current_date`,
  );
  res.json({ success: true, data: rows[0] });
});

export default router;
