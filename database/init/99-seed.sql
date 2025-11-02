-- Idempotent seed for first-run (safe to re-run). No WITH, no CRLF assumptions.

-- 0) ร้านพื้นฐาน (หนึ่งร้านเริ่มต้น)
INSERT INTO pos.stores (name, address, phone, currency_code, timezone, active)
SELECT 'Default Store', 'Bangkok', '000-000-0000', 'THB', 'Asia/Bangkok', TRUE
WHERE NOT EXISTS (SELECT 1 FROM pos.stores);

-- ดึง store_id แรก (ใช้เป็น default สำหรับ seed)
-- (ใช้ซ้ำหลายจุดด้วย subquery ย่อย จะไม่พึ่ง WITH)
-- ตรวจสอบว่ามี store จริง
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pos.stores) THEN
    RAISE EXCEPTION 'No store created by seed step 0';
  END IF;
END$$;

-- 1) หมวดหมู่: Coffee
INSERT INTO pos.menu_categories (store_id, name, description, sort_order, active)
SELECT s.store_id, 'กาแฟ', 'เครื่องดื่มที่มีส่วนผสมของกาแฟ', 1, TRUE
FROM (SELECT store_id FROM pos.stores ORDER BY store_id ASC LIMIT 1) s
WHERE NOT EXISTS (
  SELECT 1 FROM pos.menu_categories mc
  WHERE mc.store_id = s.store_id AND mc.name = 'กาแฟ'
);

-- 2) หมวดหมู่: Tea
INSERT INTO pos.menu_categories (store_id, name, description, sort_order, active)
SELECT s.store_id, 'ชา', 'เครื่องดื่มที่มีส่วนผสมของชา', 2, TRUE
FROM (SELECT store_id FROM pos.stores ORDER BY store_id ASC LIMIT 1) s
WHERE NOT EXISTS (
  SELECT 1 FROM pos.menu_categories mc
  WHERE mc.store_id = s.store_id AND mc.name = 'ชา'
);

-- 3) หมวดหมู่: Topping
INSERT INTO pos.menu_categories (store_id, name, description, sort_order, active)
SELECT s.store_id, 'ท็อปปิ้ง', 'ส่วนประกอบเพิ่มเติม', 3, TRUE
FROM (SELECT store_id FROM pos.stores ORDER BY store_id ASC LIMIT 1) s
WHERE NOT EXISTS (
  SELECT 1 FROM pos.menu_categories mc
  WHERE mc.store_id = s.store_id AND mc.name = 'ท็อปปิ้ง'
);

-- -- 3) เมนู Coffee (Americano, Latte) — ทำเมื่อมี category 'Coffee'
-- INSERT INTO pos.menu_items (store_id, category_id, name, price, cost, available, tax_rate)
-- SELECT
--   s.store_id,
--   (SELECT category_id
--      FROM pos.menu_categories
--      WHERE store_id = s.store_id AND name = 'Coffee'
--      ORDER BY category_id ASC LIMIT 1),
--   v.name, v.price, v.cost, TRUE, 0
-- FROM (SELECT store_id FROM pos.stores ORDER BY store_id ASC LIMIT 1) s,
--      (VALUES
--         ('Americano', 45.00, 12.00),
--         ('Latte',     55.00, 18.00)
--      ) AS v(name, price, cost)
-- WHERE EXISTS (
--   SELECT 1 FROM pos.menu_categories
--   WHERE store_id = s.store_id AND name = 'Coffee'
-- )
-- ON CONFLICT (store_id, name) DO NOTHING;

-- 4) เมนู Tea (ชาไทย, ชาดำเย็น) — ทำเมื่อมี category 'Tea'
INSERT INTO pos.menu_items (store_id, category_id, name, price, cost, available, tax_rate)
SELECT
  s.store_id,
  (SELECT category_id
     FROM pos.menu_categories
     WHERE store_id = s.store_id AND name = 'ชา'
     ORDER BY category_id ASC LIMIT 1),
  v.name, v.price, v.cost, TRUE, 0
FROM (SELECT store_id FROM pos.stores ORDER BY store_id ASC LIMIT 1) s,
     (VALUES
        ('ชาไทย (ชาใต้)', 35.00, 10.00),
        ('ชาดำเย็น',      35.00,  8.00)
     ) AS v(name, price, cost)
WHERE EXISTS (
  SELECT 1 FROM pos.menu_categories
  WHERE store_id = s.store_id AND name = 'ชา'
)
ON CONFLICT (store_id, name) DO NOTHING;

-- 6) เมนู ท็อปปิ้ง (วิปครีม, ครีมชีส) — ทำเมื่อมี category 'ท็อปปิ้ง'
INSERT INTO pos.menu_items (store_id, category_id, name, price, cost, available, tax_rate)
SELECT
  s.store_id,
  (SELECT category_id
     FROM pos.menu_categories
     WHERE store_id = s.store_id AND name = 'ท็อปปิ้ง'
     ORDER BY category_id ASC LIMIT 1),
  v.name, v.price, v.cost, TRUE, 0
FROM (SELECT store_id FROM pos.stores ORDER BY store_id ASC LIMIT 1) s,
     (VALUES
        ('วิปครีม', 20.00, 10.00),
        ('ครีมชีส',      15.00,  8.00),
        ('ไข่มุก',      5.00,  2.00),
        ('บุกบราวน์ชูการ์',      5.00,  2.00)
     ) AS v(name, price, cost)
WHERE EXISTS (
  SELECT 1 FROM pos.menu_categories
  WHERE store_id = s.store_id AND name = 'ท็อปปิ้ง'
)
ON CONFLICT (store_id, name) DO NOTHING;

-- 5) บัญชีแอดมินตัวอย่าง (หนึ่งร้านหนึ่งอีเมล/ยูสเซอร์เนม)
INSERT INTO pos.accounts (store_id, email, username, password_hash, role, is_active)
SELECT s.store_id,
       'chamarodfai@gmail.com',
       'admin',
       crypt('chamarodfai101', gen_salt('bf', 10)),
       'owner', TRUE
FROM (SELECT store_id FROM pos.stores ORDER BY store_id ASC LIMIT 1) s
WHERE NOT EXISTS (
  SELECT 1 FROM pos.accounts a
  WHERE a.store_id = s.store_id
    AND (a.email = 'chamarodfai@gmail.com' OR a.username = 'admin')
);

-- 6) โปรโมชันตัวอย่าง
INSERT INTO pos.promotions (store_id, name, description, discount_type, discount_value,
                            min_order_amount, start_at, end_at, active)
SELECT s.store_id, 'Opening 10% Off', 'Grand opening discount', 'percent', 10.00,
       0, NOW() - INTERVAL '1 day', NOW() + INTERVAL '30 days', TRUE
FROM (SELECT store_id FROM pos.stores ORDER BY store_id ASC LIMIT 1) s
ON CONFLICT (store_id, name) DO NOTHING;
