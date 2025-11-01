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

export async function salesReportDaily(dateStr: string) {
  const dateParam = dateStr;
  const totalsSql = `
    WITH paid_orders AS (
      SELECT o.order_id
      FROM pos.orders o
      WHERE o.store_id = $1
        AND o.status = 'paid'
        AND (o.created_at AT TIME ZONE 'Asia/Bangkok')::date = $2::date
    )
    SELECT
      (SELECT COUNT(*) FROM pos.orders o
         WHERE o.order_id IN (SELECT order_id FROM paid_orders))::int AS total_orders,
      COALESCE((SELECT SUM(o.total) FROM pos.orders o
         WHERE o.order_id IN (SELECT order_id FROM paid_orders)), 0)::numeric AS total_revenue;
  `;
  const { rows: totalRows } = await pool.query(totalsSql, [STORE_ID, dateParam]);
  const totals = totalRows[0] ?? { total_orders: 0, total_revenue: 0 };

  const profitSql = `
    WITH paid_orders AS (
      SELECT o.order_id
      FROM pos.orders o
      WHERE o.store_id = $1
        AND o.status = 'paid'
        AND (o.created_at AT TIME ZONE 'Asia/Bangkok')::date = $2::date
    )
    SELECT COALESCE(SUM(oi.subtotal - (oi.cost_at_sale * oi.quantity)), 0)::numeric AS total_profit
    FROM pos.order_items oi
    WHERE oi.order_id IN (SELECT order_id FROM paid_orders);
  `;
  const { rows: profitRows } = await pool.query(profitSql, [STORE_ID, dateParam]);
  const profit = profitRows[0]?.total_profit ?? 0;

  const topSql = `
    WITH paid_orders AS (
      SELECT o.order_id
      FROM pos.orders o
      WHERE o.store_id = $1
        AND o.status = 'paid'
        AND (o.created_at AT TIME ZONE 'Asia/Bangkok')::date = $2::date
    )
    SELECT mi.name,
           COALESCE(SUM(oi.quantity), 0)::numeric AS quantity,
           COALESCE(SUM(oi.subtotal), 0)::numeric AS revenue
    FROM pos.order_items oi
    JOIN pos.menu_items mi ON mi.menu_item_id = oi.menu_item_id
    WHERE oi.order_id IN (SELECT order_id FROM paid_orders)
    GROUP BY mi.name
    ORDER BY revenue DESC, quantity DESC
    LIMIT 5;
  `;
  const { rows: topRows } = await pool.query(topSql, [STORE_ID, dateParam]);

  return {
    period: 'daily',
    date: dateParam,
    totalOrders: Number(totals.total_orders || 0),
    totalRevenue: Number(totals.total_revenue || 0),
    totalProfit: Number(profit || 0),
    topSellingItems: topRows.map(r => ({
      name: r.name,
      quantity: Number(r.quantity || 0),
      revenue: Number(r.revenue || 0),
    }))
  };
}

export async function salesTrend(days: number) {
  // last N days including today (Bangkok)
  const sql = `
    WITH d AS (
      SELECT generate_series(0, $2) AS offset
    )
    , day_span AS (
      SELECT (timezone('Asia/Bangkok', now())::date - offset)::date AS day
      FROM d
    )
    , daily AS (
      SELECT (o.created_at AT TIME ZONE 'Asia/Bangkok')::date AS day,
             COUNT(*) FILTER (WHERE o.status='paid') AS orders_paid,
             COALESCE(SUM(o.total) FILTER (WHERE o.status='paid'),0)::numeric AS revenue_paid
      FROM pos.orders o
      WHERE o.store_id = $1
        AND (o.created_at AT TIME ZONE 'Asia/Bangkok')::date >= (timezone('Asia/Bangkok', now())::date - $2)
      GROUP BY 1
    )
    SELECT s.day::text AS date,
           COALESCE(daily.revenue_paid, 0)::float8 AS revenue,
           COALESCE(daily.orders_paid, 0)::int AS orders
    FROM day_span s
    LEFT JOIN daily ON daily.day = s.day
    ORDER BY s.day ASC;
  `;
  const { rows } = await pool.query(sql, [STORE_ID, days-1]);
  return rows;
}
