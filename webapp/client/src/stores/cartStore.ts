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
  [k: string]: any;
};

type LocalTopping = { id: string; name: string; price: number };

type LocalCartItem = {
  id: number;
  menuItemId: number;
  price: number;
  quantity: number;
  menuItem?: LocalMenuItem;
  sweetness?: 'extra' | 'normal' | 'less' | 'none';
  toppings?: LocalTopping[];
  variantKey?: string;
};

// 👇 แก้ TS6133: ใช้ชื่อ `_subtotal` เพื่อสื่อว่าไม่ถูกใช้งาน
function computePromotionDiscount(_subtotal: number, promo?: LocalPromotion | undefined): number {
  if (!promo || !promo.active) return 0;
  // TODO: เติมตรรกะโปรโมชันจริงของคุณ
  return 0;
}

function recalc(items: LocalCartItem[], promo?: LocalPromotion) {
  const subtotal = items.reduce((s, it) => s + Number(it.price) * Number(it.quantity), 0);
  const discount = computePromotionDiscount(subtotal, promo);
  return { subtotal, discount, total: subtotal - discount };
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
    const list = get().items.slice();
    const variantKey = (menuItem.variantKey ?? `v|${menuItem.id}`);
    const idx = list.findIndex(
      (x) => x.menuItemId === Number(menuItem.id) && (x.variantKey ?? '') === variantKey
    );

    if (idx >= 0) {
      list[idx] = { ...list[idx], quantity: list[idx].quantity + 1 };
    } else {
      const item: LocalCartItem = {
        id: Number(menuItem.id),
        menuItemId: Number(menuItem.id),
        price: Number(menuItem.customPrice ?? menuItem.price),
        quantity: 1,
        menuItem,
        sweetness: menuItem.sweetness,
        toppings: menuItem.toppings,
        variantKey,
      };
      list.push(item);
    }

    const { selectedPromotion } = get();
    set({ items: list, ...recalc(list, selectedPromotion) });
  },

  removeItem: (menuItemId, variantKey) => {
    let list = get().items.slice();
    list = list.filter((x) =>
      variantKey ? !(x.menuItemId === Number(menuItemId) && (x.variantKey ?? '') === variantKey)
                 : x.menuItemId !== Number(menuItemId)
    );
    const { selectedPromotion } = get();
    set({ items: list, ...recalc(list, selectedPromotion) });
  },

  updateQuantity: (menuItemId, quantity, variantKey) => {
    let list = get().items.slice();
    list = list.map((x) => {
      const match = variantKey
        ? x.menuItemId === Number(menuItemId) && (x.variantKey ?? '') === variantKey
        : x.menuItemId === Number(menuItemId);
      return match ? { ...x, quantity } : x;
    });
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
