// src/services/orders.service.ts
import { pool } from '../config/db';
import type { OrderCreateRequest } from '../types';

const STORE_ID = Number(process.env.STORE_ID ?? 1);

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
    `SELECT order_id AS id, order_number AS "orderNumber", subtotal, discount,
            promotion_id AS "promotionId", tax_amount AS "taxAmount",
            service_charge AS "serviceCharge", total, status,
            created_at AS "createdAt"
     FROM pos.orders
     WHERE store_id = $1
     ORDER BY created_at DESC
     LIMIT 200`, [STORE_ID]
  );
  return rows;
}

export async function createOrder(payload: OrderCreateRequest) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const orderNumber = await getNextOrderNumber();

    const orderRes = await client.query(
      `INSERT INTO pos.orders (store_id, order_number, customer_id, cashier_id, subtotal, discount, promotion_id,
                               tax_amount, service_charge, total, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, COALESCE($11,'open')::pos.order_status_enum)
       RETURNING order_id AS id, order_number AS "orderNumber"`,
      [STORE_ID, orderNumber, payload.customerId ?? null, payload.cashierId ?? null,
       payload.subtotal, payload.discount ?? 0, payload.promotionId ?? null,
       payload.taxAmount ?? 0, payload.serviceCharge ?? 0, payload.total, payload.status ?? 'open']
    );
    const orderId = orderRes.rows[0].id as number;

    for (const it of payload.items ?? []) {
      await client.query(
        `INSERT INTO pos.order_items (order_id, menu_item_id, quantity, price, discount, tax_amount, subtotal, note)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [orderId, it.menuItemId, it.quantity, it.price, it.discount ?? 0, it.taxAmount ?? 0, it.subtotal, it.note ?? null]
      );
    }

    if (payload.payments?.length) {
      for (const p of payload.payments) {
        await client.query(
          `INSERT INTO pos.payments (order_id, method, amount, reference)
           VALUES ($1, $2::pos.payment_method_enum, $3, $4)`,
          [orderId, p.method, p.amount, p.reference ?? null]
        );
      }
    }

    // ถ้าปิดบิล → เปลี่ยนเป็น paid (trigger ใน DB จะหักสต๊อก+คำนวณ COGS)
    if (payload.status === 'paid') {
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
