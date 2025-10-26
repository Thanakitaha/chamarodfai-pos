// src/services/reports.service.ts
import { pool } from '../config/db';
const STORE_ID = Number(process.env.STORE_ID ?? 1);

export async function salesDaily(from?:string, to?:string) {
  const cond:string[] = [`store_id = $1`];
  const params:any[] = [STORE_ID];

  if (from) { params.push(from); cond.push(`sale_day >= $${params.length}`); }
  if (to)   { params.push(to);   cond.push(`sale_day <  $${params.length}`); }

  const { rows } = await pool.query(
    `SELECT sale_day, orders_paid, subtotal_paid, discount_paid, tax_paid, service_paid, total_paid
     FROM pos.v_sales_daily
     WHERE ${cond.join(' AND ')}
     ORDER BY sale_day DESC`, params
  );
  return rows;
}

export async function topMenu(limit=10) {
  const { rows } = await pool.query(
    `SELECT menu_item_id AS id, name, qty_sold, revenue
     FROM pos.v_top_menu_items
     WHERE store_id = $1
     ORDER BY revenue DESC
     LIMIT $2`, [STORE_ID, limit]
  );
  return rows;
}
