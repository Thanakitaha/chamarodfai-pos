// src/services/orders.service.ts
import { pool } from '../config/db';
import type { OrderCreateRequest } from '../types';

const STORE_ID = Number(process.env.STORE_ID ?? 1);

type PromotionRow = {
  id: number;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderAmount: number | null;
  startDate: Date;
  endDate: Date;
  active: boolean;
};

function computePromotionDiscount(subtotal: number, promo?: PromotionRow | null): number {
  if (!promo) return 0;
  if (!promo.active) return 0;
  if (promo.startDate && promo.endDate) {
    const now = new Date();
    if (now < new Date(promo.startDate) || now > new Date(promo.endDate)) return 0;
  }
  if (promo.minOrderAmount && subtotal < Number(promo.minOrderAmount)) return 0;

  if (promo.discountType === 'percentage') {
    return Math.max(0, Number((subtotal * promo.discountValue) / 100));
  }
  // fixed
  return Math.min(subtotal, Math.max(0, Number(promo.discountValue)));
}

export async function getNextOrderNumber(): Promise<string> {
  const { rows } = await pool.query(
    `SELECT to_char(now(),'YYYYMMDD')||LPAD((COUNT(*)+1)::text, 4, '0') AS next_no
     FROM pos.orders
     WHERE created_at::date = current_date AND store_id = $1`, [STORE_ID]
  );
  return rows[0].next_no as string;
}

export async function listOrders() {
  const { rows } = await pool.query(
    `SELECT order_id AS id, order_number AS "orderNumber",
            subtotal, discount, promotion_id AS "promotionId",
            tax_amount AS "taxAmount", service_charge AS "serviceCharge",
            total, status, created_at AS "createdAt"
     FROM pos.orders
     WHERE store_id = $1
     ORDER BY created_at DESC
     LIMIT 200`,
    [STORE_ID]
  );
  return rows;
}

export async function createOrder(payload: OrderCreateRequest): Promise<{ id: number; orderNumber: string }> {
  // payload ที่ต้องการ: items[], promotionId (nullable), taxAmount, serviceCharge, status
  // ** บังคับสถานะจ่ายเงินใช้ 'paid' เท่านั้น **
  const status = payload.status === 'paid' ? 'paid' : 'open';

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ตรวจ promotion (ถ้ามี)
    let promo: PromotionRow | null = null;
    if (payload.promotionId) {
      const pr = await client.query(
        `SELECT promotion_id AS id,
                discount_type AS "discountType",
                discount_value AS "discountValue",
                min_order_amount AS "minOrderAmount",
                start_at AS "startDate", end_at AS "endDate",
                active
         FROM pos.promotions
         WHERE promotion_id = $1 AND store_id = $2`,
        [payload.promotionId, STORE_ID]
      );
      promo = pr.rows[0] || null;
    }

    // คำนวณ subtotal จาก items
    const subtotal = payload.items.reduce((s, it) => s + (Number(it.price) * Number(it.quantity)), 0);
    const discount = computePromotionDiscount(subtotal, promo);
    const taxAmount = Number(payload.taxAmount ?? 0);
    const serviceCharge = Number(payload.serviceCharge ?? 0);
    const total = Math.max(0, subtotal - discount + taxAmount + serviceCharge);

    // ออกเลขบิล
    const orderNumber = await (async () => {
      const { rows } = await client.query(
        `SELECT to_char(now(),'YYYYMMDD')||LPAD((COUNT(*)+1)::text, 4, '0') AS next_no
         FROM pos.orders
         WHERE created_at::date = current_date AND store_id = $1`,
        [STORE_ID]
      );
      return rows[0].next_no as string;
    })();

    // insert orders
    const ins = await client.query(
      `INSERT INTO pos.orders
         (store_id, order_number, subtotal, discount, promotion_id, tax_amount, service_charge, total, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING order_id`,
      [STORE_ID, orderNumber, subtotal, discount, payload.promotionId ?? null,
       taxAmount, serviceCharge, total, status]
    );
    const orderId: number = ins.rows[0].order_id;

    // insert order_items
    for (const it of payload.items) {
      await client.query(
        `INSERT INTO pos.order_items
           (order_id, menu_item_id, quantity, price, discount, tax_amount)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [orderId, it.menuItemId, it.quantity, it.price, 0, 0]
      );
    }

    // ถ้าปิดบิล → เปลี่ยนเป็น paid (trigger ใน DB จะหักสต๊อก+คำนวณ COGS)
    if (status === 'paid') {
      await client.query(`UPDATE pos.orders SET status='paid' WHERE order_id=$1`, [orderId]);
    }

    await client.query('COMMIT');
    return { id: orderId, orderNumber };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
