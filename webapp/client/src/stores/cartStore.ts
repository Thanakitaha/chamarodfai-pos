import { create } from 'zustand';
import type { MenuItem, Promotion } from '../types';

/** ใช้ชนิดภายใน store เพื่อไม่ชนกับ OrderItem กลางที่บางที่กำหนด field อื่นเพิ่ม */
export type CartItem = {
  id: number;           // ใช้ menuItemId เป็น key
  menuItemId: number;
  price: number;
  quantity: number;
  menuItem?: MenuItem;  // เก็บเมนูไว้โชว์ชื่อได้
};

function computePromotionDiscount(subtotal: number, promo?: Promotion): number {
  if (!promo) return 0;
  if (!promo.active) return 0;
  const now = new Date();
  if (promo.startDate && new Date(promo.startDate) > now) return 0;
  if (promo.endDate && new Date(promo.endDate) < now) return 0;
  if (promo.minOrderAmount && subtotal < promo.minOrderAmount) return 0;
  return promo.discountType === 'percentage'
    ? Math.max(0, (subtotal * promo.discountValue) / 100)
    : Math.min(subtotal, Math.max(0, promo.discountValue));
}

interface CartStore {
  items: CartItem[];
  selectedPromotion?: Promotion;
  subtotal: number;
  discount: number;
  total: number;

  addItem: (item: MenuItem) => void;
  removeItem: (menuItemId: number) => void;
  updateQuantity: (menuItemId: number, quantity: number) => void;
  clearCart: () => void;
  applyPromotion: (promotion?: Promotion) => void;
}

const recalc = (items: CartItem[], promo?: Promotion) => {
  const subtotal = items.reduce((s, it) => s + Number(it.price) * Number(it.quantity), 0);
  const discount = computePromotionDiscount(subtotal, promo);
  const total = Math.max(0, subtotal - discount);
  return { subtotal, discount, total };
};

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  selectedPromotion: undefined,
  subtotal: 0,
  discount: 0,
  total: 0,

  addItem: (item) => {
    const menuItemId = Number(item.id);
    const exists = get().items.find((x) => x.menuItemId === menuItemId);
    let items: CartItem[];
    if (exists) {
      items = get().items.map((x) =>
        x.menuItemId === menuItemId ? { ...x, quantity: x.quantity + 1 } : x
      );
    } else {
      items = [
        ...get().items,
        { id: menuItemId, menuItemId, price: Number(item.price), quantity: 1, menuItem: item },
      ];
    }
    const { selectedPromotion } = get();
    set({ items, ...recalc(items, selectedPromotion) });
  },

  removeItem: (menuItemId) => {
    const items = get().items.filter((x) => x.menuItemId !== menuItemId);
    const { selectedPromotion } = get();
    set({ items, ...recalc(items, selectedPromotion) });
  },

  updateQuantity: (menuItemId, quantity) => {
    let items = get().items.map((x) => (x.menuItemId === menuItemId ? { ...x, quantity } : x));
    items = items.filter((x) => x.quantity > 0);
    const { selectedPromotion } = get();
    set({ items, ...recalc(items, selectedPromotion) });
  },

  clearCart: () => {
    set({ items: [], selectedPromotion: undefined, subtotal: 0, discount: 0, total: 0 });
  },

  applyPromotion: (promotion) => {
    const items = get().items;
    set({ selectedPromotion: promotion, ...recalc(items, promotion) });
  },
}));
