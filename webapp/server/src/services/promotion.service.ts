// src/services/promotion.service.ts
import { pool } from '../config/db';
const STORE_ID = Number(process.env.STORE_ID ?? 1);

export async function listPromotions(onlyActive=true, at: Date = new Date()) {
  const params: any[] = [STORE_ID];
  let where = `store_id = $1`;
  if (onlyActive) {
    params.push(at);
    where += ` AND active = true AND start_at <= $2 AND end_at >= $2`;
  }
  const { rows } = await pool.query(
    `SELECT promotion_id AS id, name, description,
            discount_type AS "discountType", discount_value AS "discountValue",
            min_order_amount AS "minOrderAmount",
            start_at AS "startDate", end_at AS "endDate", active
     FROM pos.promotions WHERE ${where}
     ORDER BY start_at DESC`, params
  );
  return rows;
}
