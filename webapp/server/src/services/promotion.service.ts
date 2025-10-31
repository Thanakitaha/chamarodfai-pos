// src/services/promotion.service.ts
import { pool } from '../config/db';
const STORE_ID = Number(process.env.STORE_ID ?? 1);

export type PromotionInput = {
  name: string;
  description?: string | null;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderAmount?: number | null;
  startDate: string; // ISO
  endDate: string;   // ISO
  active?: boolean;
};

function validate(input: PromotionInput) {
  const { discountType, discountValue, minOrderAmount, startDate, endDate } = input;
  if (!['percentage', 'fixed'].includes(discountType)) {
    throw new Error('Invalid discountType');
  }
  if (discountValue < 0) throw new Error('discountValue must be >= 0');
  if (minOrderAmount != null && minOrderAmount < 0) {
    throw new Error('minOrderAmount must be >= 0');
  }
  if (new Date(startDate) > new Date(endDate)) {
    throw new Error('startDate must be <= endDate');
  }
}

export async function listPromotions(onlyActive = true, at: Date = new Date()) {
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

export async function createPromotion(input: PromotionInput) {
  validate(input);
  const { rows } = await pool.query(
    `INSERT INTO pos.promotions
       (store_id, name, description, discount_type, discount_value,
        min_order_amount, start_at, end_at, active)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING promotion_id AS id`,
    [STORE_ID, input.name, input.description ?? null, input.discountType,
     input.discountValue, input.minOrderAmount ?? null,
     input.startDate, input.endDate, input.active ?? true]
  );
  return rows[0];
}

export async function updatePromotion(id: number, input: PromotionInput) {
  validate(input);
  const result = await pool.query(
    `UPDATE pos.promotions
     SET name=$1, description=$2, discount_type=$3, discount_value=$4,
         min_order_amount=$5, start_at=$6, end_at=$7, active=$8
     WHERE promotion_id=$9 AND store_id=$10`,
    [input.name, input.description ?? null, input.discountType, input.discountValue,
     input.minOrderAmount ?? null, input.startDate, input.endDate,
     input.active ?? true, id, STORE_ID]
  );
  const rc = Number(result.rowCount ?? 0);
  return rc > 0;
}

export async function deletePromotion(id: number) {
  const result = await pool.query(
    `DELETE FROM pos.promotions WHERE promotion_id=$1 AND store_id=$2`,
    [id, STORE_ID]
  );
  const rc = Number(result.rowCount ?? 0);
  return rc > 0;
}

export async function togglePromotion(id: number) {
  const { rows } = await pool.query(
    `UPDATE pos.promotions
     SET active = NOT active
     WHERE promotion_id=$1 AND store_id=$2
     RETURNING active`,
    [id, STORE_ID]
  );
  return rows[0] ? rows[0].active : null;
}
