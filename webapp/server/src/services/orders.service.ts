// src/services/orders.service.ts
import { pool } from '../config/db';
import type { OrderCreateRequest } from '../types';

const STORE_ID = Number(process.env.STORE_ID ?? 1);

type PromotionRow = {
  id: number;
  discountType: 'percentage' | 'percent' | 'fixed'; // ✅ รองรับทั้งสองคำ
  discountValue: number;
  minOrderAmount: number | null;
  startDate: Date;
  endDate: Date;
  active: boolean;
};

function computePromotionDiscount(subtotal: number, promo?: PromotionRow | null): number {
  if (!promo) return 0;
  if (!promo.active) return 0;

  // ช่วงเวลา
  const now = new Date();
  if (promo.startDate && now < new Date(promo.startDate)) return 0;
  if (promo.endDate && now > new Date(promo.endDate)) return 0;

  // ขั้นต่ำ
  if (promo.minOrderAmount && subtotal < Number(promo.minOrderAmount)) return 0;

  const t = promo.discountType;
  if (t === 'percentage' || t === 'percent') {
    return Math.max(0, (subtotal * Number(promo.discountValue)) / 100);
  }
  // fixed
  return Math.min(subtotal, Math.max(0, Number(promo.discountValue)));
}

export async function getNextOrderNumber(): Promise<string> {
  const { rows } = await pool.query(
    `SELECT to_char(now(),'YYYYMMDD')||LPAD((COUNT(*)+1)::text, 4, '0') AS next_no
     FROM pos.orders
     WHERE created_at::date = current_date AND store_id = $1`,
    [STORE_ID]
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
  // status: บังคับอยู่ใน ('open','paid'); อย่าส่ง 'completed'
  const status = payload.status === 'paid' ? 'paid' : 'open';

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // โหลดโปรโมชันถ้ามี
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

    // สรุปยอด
    const subtotal = payload.items.reduce((s, it) => s + Number(it.price) * Number(it.quantity), 0);
    const discount = computePromotionDiscount(subtotal, promo);
    const taxAmount = Number(payload.taxAmount ?? 0);
    const serviceCharge = Number(payload.serviceCharge ?? 0);
    const total = Math.max(0, subtotal - discount + taxAmount + serviceCharge);

    const orderNumber = await getNextOrderNumber();

    const ins = await client.query(
      `INSERT INTO pos.orders
         (store_id, order_number, subtotal, discount, promotion_id, tax_amount, service_charge, total, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING order_id`,
      [STORE_ID, orderNumber, subtotal, discount, payload.promotionId ?? null, taxAmount, serviceCharge, total, status]
    );
    const orderId: number = ins.rows[0].order_id;

    // รายการสินค้า
    for (const it of payload.items) {
      await client.query(
        `INSERT INTO pos.order_items
           (order_id, menu_item_id, quantity, price, discount, tax_amount)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [orderId, it.menuItemId, it.quantity, it.price, 0, 0]
      );
    }

    if (status === 'paid') {
      // trigger ฝั่ง DB จะหักสต็อก/COGS ให้อัตโนมัติอยู่แล้ว
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
