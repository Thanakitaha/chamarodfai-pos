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

export async function salesSummaryDaily(dateISO: string) {
  const { rows } = await pool.query(
    `
    SELECT
      DATE($1) AS date,
      COALESCE(SUM(oi.total_price), 0)::numeric AS total_sales
    FROM pos.orders o
    LEFT JOIN pos.order_items oi ON oi.order_id = o.order_id
    WHERE DATE(o.created_at AT TIME ZONE 'UTC') = DATE($1)
  `,
    [dateISO]
  );
  return rows?.[0] ?? { date: dateISO, total_sales: 0 };
}

export async function salesTrend(days: number) {
  const { rows } = await pool.query(
    `
    WITH d AS (
      SELECT generate_series(
        CURRENT_DATE - ($1::int - 1) * INTERVAL '1 day',
        CURRENT_DATE,
        INTERVAL '1 day'
      )::date AS dte
    )
    SELECT
      d.dte AS date,
      COALESCE(SUM(oi.total_price), 0)::numeric AS total_sales
    FROM d
    LEFT JOIN pos.orders o
      ON (o.created_at AT TIME ZONE 'UTC')::date = d.dte
    LEFT JOIN pos.order_items oi
      ON oi.order_id = o.order_id
    GROUP BY d.dte
    ORDER BY d.dte ASC
  `,
    [days]
  );
  return rows;
}