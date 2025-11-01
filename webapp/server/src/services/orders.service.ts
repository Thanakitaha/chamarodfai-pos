// src/services/orders.service.ts
import { pool } from '../config/db';

const STORE_ID = Number(process.env.STORE_ID ?? 1);

type DiscountType = 'percent' | 'percentage' | 'fixed';

type CreateOrderItem = {
  menuItemId: number;
  price: number;         // ราคาต่อหน่วย (ไม่รวมโปรฯ)
  quantity: number;
  note?: string | null;
};

type CreateOrderPayload = {
  items: CreateOrderItem[];
  promotionId?: number | null;
  taxAmount?: number;        // สามารถส่งมา หรือคำนวณเอง (ที่นี่ใช้ค่าที่ client ส่ง)
  serviceCharge?: number;    // เช่น 0
  orderNumber?: string | null;
  status?: 'pending' | 'paid';
};

type PromotionRow = {
  promotion_id: number;
  store_id: number;
  name: string;
  description: string | null;
  discount_type: DiscountType;       // ใน DB เป็น enum ('percent'|'fixed'); ฝั่งโค้ดเผื่อ 'percentage'
  discount_value: number;
  min_order_amount: number | null;
  start_date: Date | string;
  end_date: Date | string;
  active: boolean;
};

function normalizeDiscountType(t: DiscountType): 'percent' | 'fixed' {
  if (t === 'percentage') return 'percent';
  return t;
}

function isInDateRange(now: Date, start?: Date | string | null, end?: Date | string | null) {
  const s = start ? new Date(start) : null;
  const e = end ? new Date(end) : null;
  if (s && now < s) return false;
  if (e && now > e) return false;
  return true;
}

async function fetchPromotion(promotionId: number): Promise<PromotionRow | null> {
  const { rows } = await pool.query<PromotionRow>(
    `SELECT promotion_id, store_id, name, description,
            discount_type, discount_value, min_order_amount,
            start_date, end_date, active
     FROM pos.promotions
     WHERE promotion_id=$1 AND store_id=$2`,
    [promotionId, STORE_ID]
  );
  return rows[0] ?? null;
}

function computeDiscount(subtotal: number, promo: PromotionRow | null): number {
  if (!promo) return 0;
  if (!promo.active) return 0;
  if (!isInDateRange(new Date(), promo.start_date, promo.end_date)) return 0;
  if (promo.min_order_amount != null && subtotal < Number(promo.min_order_amount)) return 0;

  const dtype = normalizeDiscountType(promo.discount_type);
  const value = Number(promo.discount_value ?? 0);

  if (dtype === 'fixed') {
    return Math.max(0, Math.min(value, subtotal));
  }
  // percent
  const pct = Math.max(0, value);
  const disc = subtotal * (pct / 100);
  return Math.max(0, Math.min(disc, subtotal));
}

export async function getNextOrderNumber(): Promise<string> {
  const { rows } = await pool.query<{ orderNumber: string }>(
    `SELECT to_char(now(),'YYYYMMDD')||LPAD((COUNT(*)+1)::text, 4, '0') AS "orderNumber"
     FROM pos.orders
     WHERE created_at::date = current_date`
  );
  return rows[0]?.orderNumber ?? '000000000001';
}

export async function createOrder(payload: CreateOrderPayload) {
  const {
    items,
    promotionId = null,
    taxAmount = 0,
    serviceCharge = 0,
    orderNumber = null,
    status = 'pending',
  } = payload;

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Order must have at least one item');
  }

  // คำนวณ item_subtotal (ราคา*จำนวน) ตั้งแต่ตรงนี้ —> ป้องกัน NULL
  const sanitizedItems = items.map((it) => {
    const price = Number(it.price ?? 0);
    const qty = Number(it.quantity ?? 0);
    const lineSubtotal = price * qty;
    return {
      menuItemId: Number(it.menuItemId),
      price,
      quantity: qty,
      note: it.note ?? null,
      itemSubtotal: lineSubtotal,
    };
  });

  const orderSubtotal = sanitizedItems.reduce((s, it) => s + it.itemSubtotal, 0);

  // โหลดโปรฯ (ถ้ามี) และคำนวณ discount
  let promoRow: PromotionRow | null = null;
  if (promotionId != null) {
    promoRow = await fetchPromotion(Number(promotionId));
  }
  const discount = computeDiscount(orderSubtotal, promoRow);

  const subMinusDisc = Math.max(0, orderSubtotal - discount);
  const taxAmt = Math.max(0, Number(taxAmount ?? 0));
  const svc = Math.max(0, Number(serviceCharge ?? 0));
  const total = subMinusDisc + taxAmt + svc;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const computedOrderNumber = orderNumber ?? (await getNextOrderNumber());

    // insert orders
    const orderIns = await client.query<{ order_id: number }>(
      `INSERT INTO pos.orders
         (store_id, order_number, subtotal, discount, promotion_id, tax_amount, service_charge, total, status)
       VALUES
         ($1,       $2,           $3,       $4,       $5,           $6,         $7,            $8,    $9)
       RETURNING order_id`,
      [
        STORE_ID,
        computedOrderNumber,
        orderSubtotal,
        discount,
        promotionId,
        taxAmt,
        svc,
        total,
        status,
      ]
    );

    const orderId = orderIns.rows[0].order_id;

    // insert order_items (*** ระวังอย่าให้ subtotal เป็น NULL ***)
    for (const it of sanitizedItems) {
      await client.query(
        `INSERT INTO pos.order_items
           (order_id, menu_item_id, price, quantity, subtotal, note)
         VALUES
           ($1,       $2,           $3,    $4,       $5,       $6)`,
        [
          orderId,
          it.menuItemId,
          it.price,
          it.quantity,
          it.itemSubtotal, // คำนวณมาก่อนแล้ว → ไม่ NULL
          it.note,
        ]
      );
    }

    if (status === 'paid') {
      // ถ้าคุณมี trigger ฝั่ง DB หักสต็อก/COGS จะทำงานเอง
      await client.query(`UPDATE pos.orders SET status='paid' WHERE order_id=$1`, [orderId]);
    }

    await client.query('COMMIT');
    return { id: orderId, orderNumber: computedOrderNumber };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
