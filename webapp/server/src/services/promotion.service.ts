// src/services/promotion.service.ts
import { pool } from '../config/db';
const STORE_ID = Number(process.env.STORE_ID ?? 1);

export type PromotionView = {
  id: number;
  name: string;
  description: string | null;
  discountType: 'percentage' | 'fixed'; // ✅ ให้ client เห็น percentage
  discountValue: number;
  minOrderAmount: number | null;
  startDate: string; // ISO
  endDate: string;   // ISO
  active: boolean;
};

export type PromotionInput = {
  name: string;
  description?: string | null;
  discountType: 'percentage' | 'fixed'; // ✅ รับ percentage
  discountValue: number;
  minOrderAmount?: number | null;
  startDate: string; // ISO
  endDate: string;   // ISO
  active?: boolean;
};

function toDbDiscountType(t: 'percentage' | 'fixed'): 'percent' | 'fixed' {
  return t === 'percentage' ? 'percent' : 'fixed';
}
function fromDbDiscountType(t: 'percent' | 'fixed'): 'percentage' | 'fixed' {
  return t === 'percent' ? 'percentage' : 'fixed';
}

function validate(input: PromotionInput) {
  if (!input.name?.trim()) throw new Error('name is required');
  if (!['percentage', 'fixed'].includes(input.discountType)) throw new Error('invalid discountType');
  if (Number(input.discountValue) < 0) throw new Error('discountValue must be >= 0');
  if (!input.startDate || !input.endDate) throw new Error('startDate/endDate required');
  if (new Date(input.endDate) <= new Date(input.startDate)) throw new Error('endDate must be after startDate');
}

export async function listPromotions(onlyActive = true): Promise<PromotionView[]> {
  const { rows } = await pool.query(
    `SELECT promotion_id,
            name, description,
            discount_type, discount_value,
            min_order_amount,
            start_at, end_at,
            active
     FROM pos.promotions
     WHERE store_id=$1
       ${onlyActive ? 'AND active = TRUE' : ''}
     ORDER BY start_at DESC`,
    [STORE_ID]
  );

  return rows.map((r: any) => ({
    id: Number(r.promotion_id),
    name: r.name,
    description: r.description,
    discountType: fromDbDiscountType(r.discount_type), // ✅ normalize
    discountValue: Number(r.discount_value),
    minOrderAmount: r.min_order_amount !== null ? Number(r.min_order_amount) : null,
    startDate: new Date(r.start_at).toISOString(),
    endDate: new Date(r.end_at).toISOString(),
    active: Boolean(r.active),
  }));
}

export async function createPromotion(input: PromotionInput) {
  validate(input);
  const { rowCount } = await pool.query(
    `INSERT INTO pos.promotions
       (store_id, name, description, discount_type, discount_value, min_order_amount, start_at, end_at, active)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      STORE_ID,
      input.name.trim(),
      input.description ?? null,
      toDbDiscountType(input.discountType),      // ✅ normalize -> DB
      Number(input.discountValue),
      input.minOrderAmount ?? 0,
      new Date(input.startDate),
      new Date(input.endDate),
      input.active ?? true,
    ]
  );
  return Number(rowCount ?? 0) > 0;
}

export async function updatePromotion(id: number, input: PromotionInput) {
  validate(input);
  const { rowCount } = await pool.query(
    `UPDATE pos.promotions
        SET name=$2,
            description=$3,
            discount_type=$4,
            discount_value=$5,
            min_order_amount=$6,
            start_at=$7,
            end_at=$8,
            active=$9,
            updated_at=now()
      WHERE promotion_id=$1 AND store_id=$10`,
    [
      id,
      input.name.trim(),
      input.description ?? null,
      toDbDiscountType(input.discountType),      // ✅ normalize -> DB
      Number(input.discountValue),
      input.minOrderAmount ?? 0,
      new Date(input.startDate),
      new Date(input.endDate),
      input.active ?? true,
      STORE_ID,
    ]
  );
  return Number(rowCount ?? 0) > 0;
}

export async function deletePromotion(id: number) {
  const { rowCount } = await pool.query(
    `DELETE FROM pos.promotions WHERE promotion_id=$1 AND store_id=$2`,
    [id, STORE_ID]
  );
  return Number(rowCount ?? 0) > 0;
}

export async function togglePromotion(id: number) {
  const { rows } = await pool.query(
    `UPDATE pos.promotions
       SET active = NOT active, updated_at=now()
     WHERE promotion_id=$1 AND store_id=$2
     RETURNING active`,
    [id, STORE_ID]
  );
  return rows[0] ? Boolean(rows[0].active) : null;
}
