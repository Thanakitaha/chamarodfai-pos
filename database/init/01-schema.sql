-- Schema
CREATE SCHEMA IF NOT EXISTS pos;

-- ============================================================================
-- Enums
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role_enum') THEN
    CREATE TYPE pos.user_role_enum AS ENUM ('owner','staff');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'discount_type_enum') THEN
    CREATE TYPE pos.discount_type_enum AS ENUM ('percent','fixed');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status_enum') THEN
    CREATE TYPE pos.order_status_enum AS ENUM ('draft','open','paid','voided','refunded');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method_enum') THEN
    CREATE TYPE pos.payment_method_enum AS ENUM ('cash','card','ewallet','transfer','other');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'po_status_enum') THEN
    CREATE TYPE pos.po_status_enum AS ENUM ('draft','ordered','received','cancelled','partially_received');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'stock_move_enum') THEN
    CREATE TYPE pos.stock_move_enum AS ENUM (
      'purchase','sale','wastage','adjustment','transfer_in','transfer_out','recipe_consume','recipe_return'
    );
  END IF;
END $$;

-- ============================================================================
-- Core master tables
-- ============================================================================
CREATE TABLE IF NOT EXISTS pos.stores (
  store_id        BIGSERIAL PRIMARY KEY,
  name            TEXT NOT NULL,
  address         TEXT,
  phone           TEXT,
  currency_code   TEXT DEFAULT 'THB',
  timezone        TEXT DEFAULT 'Asia/Bangkok',
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pos.accounts (
  account_id      BIGSERIAL PRIMARY KEY,
  store_id        BIGINT NOT NULL REFERENCES pos.stores(store_id) ON DELETE CASCADE,
  email           CITEXT NOT NULL,
  username       TEXT NOT NULL,
  password_hash   TEXT NOT NULL,
  role            pos.user_role_enum NOT NULL DEFAULT 'staff',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (store_id, email)
);

CREATE TABLE IF NOT EXISTS pos.menu_categories (
  category_id     BIGSERIAL PRIMARY KEY,
  store_id        BIGINT NOT NULL REFERENCES pos.stores(store_id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  sort_order      INT  NOT NULL DEFAULT 0,
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (store_id, name)
);

CREATE TABLE IF NOT EXISTS pos.menu_items (
  menu_item_id    BIGSERIAL PRIMARY KEY,
  store_id        BIGINT NOT NULL REFERENCES pos.stores(store_id) ON DELETE CASCADE,
  category_id     BIGINT REFERENCES pos.menu_categories(category_id) ON DELETE SET NULL,
  sku             TEXT,
  name            TEXT NOT NULL,
  price           NUMERIC(12,2) NOT NULL CHECK (price >= 0),
  cost            NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (cost >= 0),
  description     TEXT,
  image_url       TEXT,
  available       BOOLEAN NOT NULL DEFAULT TRUE,
  tax_rate        NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (tax_rate >= 0),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ,
  UNIQUE (store_id, name)
);

CREATE TABLE IF NOT EXISTS pos.promotions (
  promotion_id    BIGSERIAL PRIMARY KEY,
  store_id        BIGINT NOT NULL REFERENCES pos.stores(store_id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  discount_type   pos.discount_type_enum NOT NULL,
  discount_value  NUMERIC(12,2) NOT NULL CHECK (discount_value >= 0),
  min_order_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (min_order_amount >= 0),
  start_at        TIMESTAMPTZ NOT NULL,
  end_at          TIMESTAMPTZ NOT NULL,
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_at > start_at),
  UNIQUE (store_id, name)
);

CREATE TABLE IF NOT EXISTS pos.customers (
  customer_id     BIGSERIAL PRIMARY KEY,
  store_id        BIGINT NOT NULL REFERENCES pos.stores(store_id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  phone           TEXT,
  email           CITEXT,
  note            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (store_id, phone)
);

CREATE TABLE IF NOT EXISTS pos.orders (
  order_id        BIGSERIAL PRIMARY KEY,
  store_id        BIGINT NOT NULL REFERENCES pos.stores(store_id) ON DELETE CASCADE,
  order_number    TEXT NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text,'-',''),
  customer_id     BIGINT REFERENCES pos.customers(customer_id) ON DELETE SET NULL,
  cashier_id      BIGINT REFERENCES pos.accounts(account_id) ON DELETE SET NULL,
  subtotal        NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  discount        NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
  promotion_id    BIGINT REFERENCES pos.promotions(promotion_id) ON DELETE SET NULL,
  tax_amount      NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  service_charge  NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (service_charge >= 0),
  total           NUMERIC(12,2) NOT NULL CHECK (total >= 0),
  status          pos.order_status_enum NOT NULL DEFAULT 'open',
  note            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pos.order_items (
  order_item_id   BIGSERIAL PRIMARY KEY,
  order_id        BIGINT NOT NULL REFERENCES pos.orders(order_id) ON DELETE CASCADE,
  menu_item_id    BIGINT NOT NULL REFERENCES pos.menu_items(menu_item_id),
  quantity        NUMERIC(12,3) NOT NULL CHECK (quantity > 0),
  price           NUMERIC(12,2) NOT NULL CHECK (price >= 0),
  discount        NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
  tax_amount      NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  subtotal        NUMERIC(12,2) NOT NULL CHECK (subtotal >= 0),
  cost_at_sale    NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (cost_at_sale >= 0),
  note            TEXT
);

CREATE TABLE IF NOT EXISTS pos.payments (
  payment_id      BIGSERIAL PRIMARY KEY,
  order_id        BIGINT NOT NULL REFERENCES pos.orders(order_id) ON DELETE CASCADE,
  method          pos.payment_method_enum NOT NULL,
  amount          NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  reference       TEXT,
  paid_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- Inventory & Purchasing
-- ============================================================================
CREATE TABLE IF NOT EXISTS pos.ingredients (
  ingredient_id   BIGSERIAL PRIMARY KEY,
  store_id        BIGINT NOT NULL REFERENCES pos.stores(store_id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  sku             TEXT,
  uom             TEXT NOT NULL DEFAULT 'unit',
  cost_per_uom    NUMERIC(12,4) NOT NULL DEFAULT 0 CHECK (cost_per_uom >= 0),
  low_stock_threshold NUMERIC(12,3) NOT NULL DEFAULT 0 CHECK (low_stock_threshold >= 0),
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  note            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (store_id, name)
);

CREATE TABLE IF NOT EXISTS pos.recipes (
  menu_item_id    BIGINT NOT NULL REFERENCES pos.menu_items(menu_item_id) ON DELETE CASCADE,
  ingredient_id   BIGINT NOT NULL REFERENCES pos.ingredients(ingredient_id) ON DELETE CASCADE,
  qty_per_item    NUMERIC(12,4) NOT NULL CHECK (qty_per_item > 0),
  uom             TEXT NOT NULL DEFAULT 'unit',
  PRIMARY KEY (menu_item_id, ingredient_id)
);

CREATE TABLE IF NOT EXISTS pos.suppliers (
  supplier_id     BIGSERIAL PRIMARY KEY,
  store_id        BIGINT NOT NULL REFERENCES pos.stores(store_id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  contact         TEXT,
  phone           TEXT,
  email           CITEXT,
  address         TEXT,
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (store_id, name)
);

CREATE TABLE IF NOT EXISTS pos.purchase_orders (
  po_id           BIGSERIAL PRIMARY KEY,
  store_id        BIGINT NOT NULL REFERENCES pos.stores(store_id) ON DELETE CASCADE,
  supplier_id     BIGINT NOT NULL REFERENCES pos.suppliers(supplier_id),
  po_number       TEXT NOT NULL UNIQUE DEFAULT ('PO-' || to_char(now(),'YYYYMMDD') || '-' || substr(replace(gen_random_uuid()::text,'-',''),1,6)),
  order_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_date   DATE,
  status          pos.po_status_enum NOT NULL DEFAULT 'draft',
  total_cost      NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (total_cost >= 0),
  created_by      BIGINT REFERENCES pos.accounts(account_id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pos.purchase_order_items (
  poi_id          BIGSERIAL PRIMARY KEY,
  po_id           BIGINT NOT NULL REFERENCES pos.purchase_orders(po_id) ON DELETE CASCADE,
  ingredient_id   BIGINT NOT NULL REFERENCES pos.ingredients(ingredient_id),
  quantity        NUMERIC(14,3) NOT NULL CHECK (quantity > 0),
  uom             TEXT NOT NULL DEFAULT 'unit',
  unit_cost       NUMERIC(12,4) NOT NULL CHECK (unit_cost >= 0),
  subtotal        NUMERIC(14,2) NOT NULL CHECK (subtotal >= 0),
  note            TEXT
);

CREATE TABLE IF NOT EXISTS pos.stock_movements (
  stock_move_id   BIGSERIAL PRIMARY KEY,
  store_id        BIGINT NOT NULL REFERENCES pos.stores(store_id) ON DELETE CASCADE,
  ingredient_id   BIGINT NOT NULL REFERENCES pos.ingredients(ingredient_id),
  movement_type   pos.stock_move_enum NOT NULL,
  quantity        NUMERIC(14,3) NOT NULL,
  uom             TEXT NOT NULL DEFAULT 'unit',
  unit_cost       NUMERIC(12,4),
  total_cost      NUMERIC(14,2),
  source_table    TEXT,
  source_id       BIGINT,
  note            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- Sessions
-- ============================================================================
CREATE TABLE IF NOT EXISTS pos.sessions (
  session_id   BIGSERIAL PRIMARY KEY,
  store_id     BIGINT NOT NULL,
  account_id   BIGINT NOT NULL REFERENCES pos.accounts(account_id) ON DELETE CASCADE,
  token        TEXT NOT NULL UNIQUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at   TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_sessions_token      ON pos.sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_account_id ON pos.sessions(account_id);

-- ============================================================================
-- Expenses (non-inventory)
-- ============================================================================
CREATE TABLE IF NOT EXISTS pos.expense_categories (
  expense_category_id BIGSERIAL PRIMARY KEY,
  store_id        BIGINT NOT NULL REFERENCES pos.stores(store_id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (store_id, name)
);

CREATE TABLE IF NOT EXISTS pos.expenses (
  expense_id      BIGSERIAL PRIMARY KEY,
  store_id        BIGINT NOT NULL REFERENCES pos.stores(store_id) ON DELETE CASCADE,
  expense_category_id BIGINT REFERENCES pos.expense_categories(expense_category_id) ON DELETE SET NULL,
  supplier_id     BIGINT REFERENCES pos.suppliers(supplier_id) ON DELETE SET NULL,
  description     TEXT,
  amount          NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  incurred_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  reference       TEXT,
  created_by      BIGINT REFERENCES pos.accounts(account_id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- Indexes
-- ============================================================================
CREATE UNIQUE INDEX IF NOT EXISTS uq_accounts_store_username
  ON pos.accounts (store_id, username)
  WHERE username IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_store_status_created
  ON pos.orders (store_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_order_items_order
  ON pos.order_items (order_id);

CREATE INDEX IF NOT EXISTS idx_payments_order
  ON pos.payments (order_id);

CREATE INDEX IF NOT EXISTS idx_menu_items_store_available
  ON pos.menu_items (store_id, available);

CREATE INDEX IF NOT EXISTS idx_stock_movements_store_ing
  ON pos.stock_movements (store_id, ingredient_id, created_at DESC);

-- ============================================================================
-- Trigger: updated_at auto
-- ============================================================================
CREATE OR REPLACE FUNCTION pos.tg_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT 'pos.'||tablename AS t
    FROM pg_tables
    WHERE schemaname='pos' AND tablename IN
      ('stores','accounts','menu_categories','menu_items','promotions',
       'customers','orders','purchase_orders','suppliers','ingredients',
       'expense_categories')
  LOOP
    EXECUTE format($f$
      DROP TRIGGER IF EXISTS trg_touch_%1$s ON %2$s;
      CREATE TRIGGER trg_touch_%1$s
        BEFORE UPDATE ON %2$s
        FOR EACH ROW EXECUTE FUNCTION pos.tg_touch_updated_at();
    $f$, replace(split_part(r.t, '.', 2), '"',''), r.t);
  END LOOP;
END $$;

-- ============================================================================
-- Add order-level COGS & Gross Profit columns (safe add)
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='pos' AND table_name='orders' AND column_name='cogs'
  ) THEN
    ALTER TABLE pos.orders
      ADD COLUMN cogs NUMERIC(14,2) NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='pos' AND table_name='orders' AND column_name='gross_profit'
  ) THEN
    ALTER TABLE pos.orders
      ADD COLUMN gross_profit NUMERIC(14,2) NOT NULL DEFAULT 0;
  END IF;
END $$;

-- ============================================================================
-- Cost helpers & recipe consumption/reversal
-- ============================================================================
CREATE OR REPLACE FUNCTION pos.fn_current_cost(p_store_id BIGINT, p_ingredient_id BIGINT)
RETURNS NUMERIC AS $$
DECLARE
  v_cost NUMERIC;
BEGIN
  SELECT sm.unit_cost
  INTO v_cost
  FROM pos.stock_movements sm
  WHERE sm.store_id = p_store_id
    AND sm.ingredient_id = p_ingredient_id
    AND sm.unit_cost IS NOT NULL
  ORDER BY sm.created_at DESC
  LIMIT 1;

  IF v_cost IS NULL THEN
    SELECT i.cost_per_uom INTO v_cost
    FROM pos.ingredients i
    WHERE i.store_id = p_store_id AND i.ingredient_id = p_ingredient_id;
  END IF;

  RETURN COALESCE(v_cost, 0);
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION pos.fn_consume_recipe_for_order(p_order_id BIGINT)
RETURNS VOID AS $$
DECLARE
  v_store_id BIGINT;
  v_status pos.order_status_enum;
  v_consumed_already BOOLEAN;
  r_item RECORD;
  r_recipe RECORD;
  v_need_qty NUMERIC;
  v_unit_cost NUMERIC;
  v_total_cost NUMERIC;
  v_cost_per_item NUMERIC;
BEGIN
  SELECT store_id, status INTO v_store_id, v_status
  FROM pos.orders WHERE order_id = p_order_id FOR UPDATE;

  IF v_status <> 'paid' THEN
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM pos.stock_movements
    WHERE store_id = v_store_id
      AND source_table = 'orders'
      AND source_id = p_order_id
      AND movement_type = 'recipe_consume'
  ) INTO v_consumed_already;

  IF v_consumed_already THEN
    RETURN;
  END IF;

  FOR r_item IN
    SELECT order_item_id, menu_item_id, quantity::NUMERIC AS qty
    FROM pos.order_items
    WHERE order_id = p_order_id
  LOOP
    v_cost_per_item := 0;

    FOR r_recipe IN
      SELECT ingredient_id, qty_per_item, uom
      FROM pos.recipes
      WHERE menu_item_id = r_item.menu_item_id
    LOOP
      v_need_qty  := r_recipe.qty_per_item * r_item.qty;
      v_unit_cost := pos.fn_current_cost(v_store_id, r_recipe.ingredient_id);
      v_total_cost := v_unit_cost * v_need_qty;

      INSERT INTO pos.stock_movements
        (store_id, ingredient_id, movement_type, quantity, uom,
         unit_cost, total_cost, source_table, source_id, note)
      VALUES
        (v_store_id, r_recipe.ingredient_id, 'recipe_consume', -v_need_qty, r_recipe.uom,
         v_unit_cost, v_total_cost, 'orders', p_order_id,
         'Auto consume by payment');

      v_cost_per_item := v_cost_per_item + (v_unit_cost * r_recipe.qty_per_item);
    END LOOP;

    UPDATE pos.order_items
    SET cost_at_sale = ROUND(v_cost_per_item * (SELECT quantity FROM pos.order_items WHERE order_item_id = r_item.order_item_id), 2)
    WHERE order_item_id = r_item.order_item_id;
  END LOOP;

  UPDATE pos.orders o
  SET cogs = COALESCE((SELECT ROUND(COALESCE(SUM(oi.cost_at_sale),0),2)
                       FROM pos.order_items oi WHERE oi.order_id = p_order_id),0),
      gross_profit = ROUND(o.total - COALESCE((SELECT COALESCE(SUM(oi.cost_at_sale),0)
                                               FROM pos.order_items oi WHERE oi.order_id = p_order_id),0), 2)
  WHERE o.order_id = p_order_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION pos.fn_reverse_recipe_for_order(p_order_id BIGINT)
RETURNS VOID AS $$
DECLARE
  v_store_id BIGINT;
  v_status pos.order_status_enum;
  v_reversed_already BOOLEAN;
  r_consume RECORD;
BEGIN
  SELECT store_id, status INTO v_store_id, v_status
  FROM pos.orders WHERE order_id = p_order_id FOR UPDATE;

  IF v_status NOT IN ('voided','refunded') THEN
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM pos.stock_movements
    WHERE store_id = v_store_id
      AND source_table = 'orders'
      AND source_id = p_order_id
      AND movement_type = 'recipe_return'
  ) INTO v_reversed_already;

  IF v_reversed_already THEN
    RETURN;
  END IF;

  FOR r_consume IN
    SELECT ingredient_id,
           SUM(quantity) AS qty,
           SUM(total_cost) AS total_cost_sum
    FROM pos.stock_movements
    WHERE store_id = v_store_id
      AND source_table = 'orders'
      AND source_id = p_order_id
      AND movement_type = 'recipe_consume'
    GROUP BY ingredient_id
  LOOP
    INSERT INTO pos.stock_movements
      (store_id, ingredient_id, movement_type, quantity, uom,
       unit_cost, total_cost, source_table, source_id, note)
    VALUES
      (v_store_id, r_consume.ingredient_id, 'recipe_return', -r_consume.qty, 'unit',
       NULL, NULL, 'orders', p_order_id, 'Auto return by void/refund');
  END LOOP;

  UPDATE pos.orders
  SET cogs = 0,
      gross_profit = 0
  WHERE order_id = p_order_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION pos.tg_orders_status_auto()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'paid' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM pos.fn_consume_recipe_for_order(NEW.order_id);
  END IF;

  IF (OLD.status = 'paid') AND (NEW.status IN ('voided','refunded')) THEN
    PERFORM pos.fn_reverse_recipe_for_order(NEW.order_id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_orders_status_auto ON pos.orders;
CREATE TRIGGER trg_orders_status_auto
AFTER UPDATE OF status ON pos.orders
FOR EACH ROW
EXECUTE FUNCTION pos.tg_orders_status_auto();

-- ============================================================================
-- Views (require tables exist)
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                 WHERE table_schema='pos' AND table_name='order_items') THEN
    RAISE EXCEPTION 'Table pos.order_items is missing. Create tables before views.';
  END IF;
END $$;

CREATE OR REPLACE VIEW pos.v_inventory_balances AS
SELECT
  i.store_id,
  i.ingredient_id,
  i.name AS ingredient_name,
  COALESCE(SUM(sm.quantity), 0) AS qty_on_hand
FROM pos.ingredients i
LEFT JOIN pos.stock_movements sm
  ON sm.ingredient_id = i.ingredient_id AND sm.store_id = i.store_id
GROUP BY i.store_id, i.ingredient_id, i.name;

CREATE OR REPLACE VIEW pos.v_sales_daily AS
SELECT
  store_id,
  date_trunc('day', created_at) AS sale_day,
  COUNT(*) FILTER (WHERE status='paid') AS orders_paid,
  SUM(subtotal)        FILTER (WHERE status='paid') AS subtotal_paid,
  SUM(discount)        FILTER (WHERE status='paid') AS discount_paid,
  SUM(tax_amount)      FILTER (WHERE status='paid') AS tax_paid,
  SUM(service_charge)  FILTER (WHERE status='paid') AS service_paid,
  SUM(total)           FILTER (WHERE status='paid') AS total_paid
FROM pos.orders
GROUP BY store_id, date_trunc('day', created_at);

CREATE OR REPLACE VIEW pos.v_top_menu_items AS
SELECT
  o.store_id,
  oi.menu_item_id,
  mi.name,
  SUM(oi.quantity) AS qty_sold,
  SUM(oi.subtotal) AS revenue
FROM pos.order_items oi
JOIN pos.orders o ON o.order_id = oi.order_id AND o.status='paid'
JOIN pos.menu_items mi ON mi.menu_item_id = oi.menu_item_id
GROUP BY o.store_id, oi.menu_item_id, mi.name
ORDER BY revenue DESC;

CREATE OR REPLACE VIEW pos.v_low_stock AS
SELECT
  i.store_id,
  i.ingredient_id,
  i.name,
  COALESCE(b.qty_on_hand,0) AS qty_on_hand,
  i.low_stock_threshold
FROM pos.ingredients i
LEFT JOIN pos.v_inventory_balances b
  ON b.ingredient_id = i.ingredient_id AND b.store_id = i.store_id
WHERE i.low_stock_threshold > 0
  AND COALESCE(b.qty_on_hand,0) <= i.low_stock_threshold;

-- ============================================================================
-- Grants (optional; adjust as needed)
-- ============================================================================
GRANT USAGE ON SCHEMA pos TO PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA pos TO PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA pos GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO PUBLIC;

-- End of script