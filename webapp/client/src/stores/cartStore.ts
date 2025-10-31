import { create } from 'zustand';
import type { MenuItem, Promotion } from '../types';

export type CartItem = {
  id: number;
  menuItemId: number;
  price: number;
  quantity: number;
  menuItem?: MenuItem;
};

// webapp/client/src/stores/cartStore.ts (เฉพาะฟังก์ชันนี้)
function computePromotionDiscount(subtotal: number, promo?: Promotion): number {
  if (!promo) return 0;
  if (!promo.active) return 0;

  const now = new Date();
  if (promo.startDate && now < new Date(promo.startDate)) return 0;
  if (promo.endDate && now > new Date(promo.endDate)) return 0;
  if (promo.minOrderAmount && subtotal < Number(promo.minOrderAmount)) return 0;

  // ✅ เทียบแบบ string เพื่อให้รองรับทั้ง 'percentage' และ 'percent' โดยไม่ชน union
  const dt = String((promo as any).discountType).toLowerCase();
  const isPercent = dt === 'percentage' || dt === 'percent';

  if (isPercent) {
    return Math.max(0, (subtotal * Number(promo.discountValue)) / 100);
  }
  // fixed
  return Math.min(subtotal, Math.max(0, Number(promo.discountValue)));
}

function recalc(items: CartItem[], promo?: Promotion) {
  const subtotal = items.reduce((s, it) => s + it.price * it.quantity, 0);
  const discount = computePromotionDiscount(subtotal, promo);
  const total = Math.max(0, subtotal - discount);
  return { subtotal, discount, total };
}

type CartState = {
  items: CartItem[];
  selectedPromotion?: Promotion;
  subtotal: number;
  discount: number;
  total: number;
  addItem: (menuItem: MenuItem) => void;
  removeItem: (menuItemId: number) => void;
  updateQuantity: (menuItemId: number, quantity: number) => void;
  clearCart: () => void;
  applyPromotion: (promotion?: Promotion) => void;
};

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  selectedPromotion: undefined,
  subtotal: 0,
  discount: 0,
  total: 0,

  addItem: (menuItem) => {
    const list = get().items.slice();
    const idx = list.findIndex((x) => x.menuItemId === Number(menuItem.id));
    if (idx >= 0) list[idx] = { ...list[idx], quantity: list[idx].quantity + 1 };
    else list.push({ id: Number(menuItem.id), menuItemId: Number(menuItem.id), price: menuItem.price, quantity: 1, menuItem });
    const { selectedPromotion } = get();
    set({ items: list, ...recalc(list, selectedPromotion) });
  },

  removeItem: (menuItemId) => {
    const list = get().items.filter((x) => x.menuItemId !== menuItemId);
    const { selectedPromotion } = get();
    set({ items: list, ...recalc(list, selectedPromotion) });
  },

  updateQuantity: (menuItemId, quantity) => {
    let list = get().items.map((x) => (x.menuItemId === menuItemId ? { ...x, quantity } : x));
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
