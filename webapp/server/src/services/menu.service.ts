// src/services/menu.service.ts
import { pool } from '../config/db';
import { mapMenuRowToApi } from '../utils/mapper';
import type { MenuItem } from '../types';
import { safeRowCount } from '../lib/db-utils';

const STORE_ID = Number(process.env.STORE_ID ?? 1);

export async function listMenuItems(): Promise<MenuItem[]> {
  const sql = `
    SELECT mi.menu_item_id AS id, mi.name, mi.price, mi.cost, mi.description,
           mi.image_url AS image, mi.available, mi.created_at, mi.updated_at,
           mi.category_id, mc.name AS category
    FROM pos.menu_items mi
    LEFT JOIN pos.menu_categories mc ON mc.category_id = mi.category_id
    WHERE mi.store_id = $1 AND mi.deleted_at IS NULL
    ORDER BY COALESCE(mc.sort_order,0), mi.name;
  `;
  const { rows } = await pool.query(sql, [STORE_ID]);
  return rows.map(mapMenuRowToApi);
}

export async function createMenuItem(
  payload: Omit<MenuItem, 'id' | 'createdAt' | 'updatedAt'>
): Promise<MenuItem> {
  const { name, price, cost, description, image, categoryId, available } = payload;
  const sql = `
    INSERT INTO pos.menu_items (store_id, name, price, cost, description, image_url, category_id, available)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    RETURNING menu_item_id AS id, name, price, cost, description, image_url AS image, available,
              category_id, created_at, updated_at;
  `;
  const params = [
    STORE_ID,
    name,
    price,
    cost ?? 0,
    description ?? null,
    image ?? null,
    categoryId ?? null,
    available ?? true,
  ];
  const { rows } = await pool.query(sql, params);
  return mapMenuRowToApi(rows[0]);
}

export async function updateMenuItem(
  id: number,
  patch: Partial<MenuItem>
): Promise<MenuItem | null> {
  const fields: string[] = [];
  const vals: any[] = [];
  let i = 1;

  const map: Record<string, string> = {
    name: 'name',
    price: 'price',
    cost: 'cost',
    description: 'description',
    image: 'image_url',
    categoryId: 'category_id',
    available: 'available',
  };

  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined || !(k in map)) continue;
    fields.push(`${map[k]} = $${++i}`); // $2, $3, ...
    vals.push(v);
  }

  if (!fields.length) {
    const r = await pool.query(
      `SELECT menu_item_id AS id, name, price, cost, description, image_url AS image, available, category_id, created_at, updated_at
       FROM pos.menu_items
       WHERE menu_item_id=$1 AND store_id=$2`,
      [id, STORE_ID]
    );
    return r.rows[0] ? mapMenuRowToApi(r.rows[0]) : null;
  }

  const sql = `
    UPDATE pos.menu_items
    SET ${fields.join(', ')}, updated_at = now()
    WHERE menu_item_id = $1 AND store_id = $2
    RETURNING menu_item_id AS id, name, price, cost, description, image_url AS image, available, category_id, created_at, updated_at;
  `;
  const { rows } = await pool.query(sql, [id, STORE_ID, ...vals]);
  return rows[0] ? mapMenuRowToApi(rows[0]) : null;
}

export async function deleteMenuItem(id: number): Promise<boolean> {
  const res = await pool.query(
    `UPDATE pos.menu_items
     SET deleted_at = now()
     WHERE menu_item_id = $1 AND store_id = $2 AND deleted_at IS NULL`,
    [id, STORE_ID]
  );
  const affected = safeRowCount(res); // ปลอดภัยกว่าอ้าง rowCount ตรง ๆ
  return affected > 0;
}
