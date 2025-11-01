// src/stores/cartStore.ts
import { create } from 'zustand';

// ===== Local types (ไม่พึ่ง ../types เพื่อกัน cache) =====
type LocalMenuItem = {
  id: number;
  name: string;
  price: number;
  [k: string]: any;
};

type LocalPromotion = {
  id: number | string;
  active: boolean;
  // รองรับสองสกุลชื่อ field
  discountType?: 'percentage' | 'fixed';
  discount_value?: number;
  discountValue?: number;
  minOrderAmount?: number | null;
  min_order_amount?: number | null;
  startDate?: string;
  start_at?: string;
  endDate?: string;
  end_at?: string;
  [k: string]: any;
};

type LocalTopping = { id: string; name: string; price: number };
type LocalCartItem = {
  menuItemId: number;
  price: number;
  quantity: number;
  menuItem?: { name?: string | null };
  variantKey?: string;
  sweetness?: 'extra' | 'normal' | 'less' | 'none';
  toppings?: LocalTopping[];
};

// ---------- helpers ----------
const toNum = (n: any, fb = 0) => {
  const v = Number(n);
  return Number.isFinite(v) ? v : fb;
};
const round2 = (n: any) => Math.round((toNum(n) + Number.EPSILON) * 100) / 100;

function isWithin(p: LocalPromotion): boolean {
  // เช็คช่วงเวลาโปร (ถ้าส่งมา)
  const now = new Date();
  const startStr = p.startDate ?? (p as any).start_at;
  const endStr = p.endDate ?? (p as any).end_at;
  if (startStr) {
    const st = new Date(startStr);
    if (isFinite(+st) && now < st) return false;
  }
  if (endStr) {
    const ed = new Date(endStr);
    if (isFinite(+ed) && now > ed) return false;
  }
  return true;
}

// คำนวณส่วนลดตามรูปแบบเดียวกับฝั่ง server (percent/fixed + minOrder + ช่วงเวลา + active)
function computePromotionDiscount(subtotal: number, promo?: LocalPromotion): number {
  if (!promo) return 0;
  if (promo.active === false) return 0;
  if (!isWithin(promo)) return 0;

  const minOrder =
    promo.minOrderAmount ?? (promo as any).min_order_amount ?? null;
  if (minOrder != null && subtotal < toNum(minOrder)) return 0;

  const t =
    (promo.discountType as string) ??
    String((promo as any).discount_type ?? '');
  const v = toNum(promo.discountValue ?? (promo as any).discount_value, 0);

  const typ = String(t || '').toLowerCase();
  if (typ === 'percent' || typ === 'percentage') {
    return Math.max(0, round2(subtotal * (v / 100)));
  }
  if (typ === 'fixed') {
    return Math.min(subtotal, Math.max(0, round2(v)));
  }
  return 0;
}

function recalc(items: LocalCartItem[], promo?: LocalPromotion) {
  const subtotal = round2(items.reduce((s, it) => s + toNum(it.price) * toNum(it.quantity), 0));
  const discount = round2(computePromotionDiscount(subtotal, promo));
  const total = round2(subtotal - discount);
  return { subtotal, discount, total };
}

type CartState = {
  items: LocalCartItem[];
  selectedPromotion?: LocalPromotion;
  subtotal: number;
  discount: number;
  total: number;

  addItem: (menuItem: LocalMenuItem & {
    customPrice?: number;
    sweetness?: LocalCartItem['sweetness'];
    toppings?: LocalCartItem['toppings'];
    variantKey?: string;
  }) => void;

  removeItem: (menuItemId: number, variantKey?: string) => void;
  updateQuantity: (menuItemId: number, quantity: number, variantKey?: string) => void;
  clearCart: () => void;
  applyPromotion: (promotion?: LocalPromotion) => void;
};

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  selectedPromotion: undefined,
  subtotal: 0,
  discount: 0,
  total: 0,

  addItem: (menuItem) => {
    let list = get().items.slice();
    const variantKey = (menuItem.variantKey ?? `v|${menuItem.id}`);

    // หา existing ตาม menuItemId + variantKey
    const idx = list.findIndex(
      (x) => x.menuItemId === menuItem.id && (x.variantKey ?? 'default') === (variantKey ?? 'default'),
    );

    const priceToUse = toNum(menuItem.customPrice ?? menuItem.price);
    if (idx === -1) {
      list.push({
        menuItemId: menuItem.id,
        price: priceToUse,
        quantity: 1,
        menuItem: { name: menuItem.name },
        variantKey,
        sweetness: (menuItem as any).sweetness,
        toppings: (menuItem as any).toppings,
      });
    } else {
      list[idx].quantity = toNum(list[idx].quantity) + 1;
      list[idx].price = priceToUse; // อัปเดตราคาให้ตรงกับ custom
    }

    const { selectedPromotion } = get();
    set({ items: list, ...recalc(list, selectedPromotion) });
  },

  removeItem: (menuItemId, variantKey) => {
    let list = get().items.slice();
    list = list.filter(
      (x) => !(x.menuItemId === menuItemId && (x.variantKey ?? 'default') === (variantKey ?? 'default')),
    );
    const { selectedPromotion } = get();
    set({ items: list, ...recalc(list, selectedPromotion) });
  },

  updateQuantity: (menuItemId, quantity, variantKey) => {
    let list = get().items.slice();
    const i = list.findIndex(
      (x) => x.menuItemId === menuItemId && (x.variantKey ?? 'default') === (variantKey ?? 'default'),
    );
    if (i !== -1) {
      list[i].quantity = toNum(quantity, 0);
    }
    list = list.filter((x) => x.quantity > 0);
    const { selectedPromotion } = get();
    set({ items: list, ...recalc(list, selectedPromotion) });
  },

  clearCart: () => {
    set({ items: [], selectedPromotion: undefined, subtotal: 0, discount: 0, total: 0 });
  },

  applyPromotion: (promotion) => {
    const items = get().items;
    set({ selectedPromotion: promotion, ...recalc(items, promotion) });
  },
}));
