import { create } from 'zustand';
import { MenuItem, OrderItem, Promotion } from '../types';

interface CartStore {
  items: OrderItem[];
  selectedPromotion?: Promotion;
  subtotal: number;
  discount: number;
  total: number;
  
  addItem: (item: MenuItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  applyPromotion: (promotion?: Promotion) => void;
}

export const useCartStore = create<CartStore>((set) => ({
  items: [],
  selectedPromotion: undefined,
  subtotal: 0,
  discount: 0,
  total: 0,

  addItem: (item) => {
    set((state) => {
      const existingItem = state.items.find(cartItem => cartItem.id === item.id);
      let newItems;
      
      if (existingItem) {
        newItems = state.items.map(cartItem =>
          cartItem.id === item.id
            ? { ...cartItem, quantity: cartItem.quantity + 1, subtotal: (cartItem.quantity + 1) * cartItem.price }
            : cartItem
        );
      } else {
        const orderItem: OrderItem = {
          id: item.id,
          menuItemId: item.id,
          menuItem: item,
          quantity: 1,
          price: item.price,
          subtotal: item.price,
        };
        newItems = [...state.items, orderItem];
      }

      const subtotal = newItems.reduce((sum, cartItem) => sum + cartItem.subtotal, 0);
      const discount = state.selectedPromotion?.discountType === 'fixed' 
        ? Math.min(state.selectedPromotion.discountValue, subtotal)
        : state.selectedPromotion?.discountType === 'percentage'
        ? subtotal * (state.selectedPromotion.discountValue / 100)
        : 0;
      const total = subtotal - discount;

      return {
        items: newItems,
        subtotal,
        discount,
        total,
      };
    });
  },

  removeItem: (id) => {
    set((state) => {
      const newItems = state.items.filter(item => item.id !== id);
      const subtotal = newItems.reduce((sum, item) => sum + item.subtotal, 0);
      const discount = state.selectedPromotion?.discountType === 'fixed' 
        ? Math.min(state.selectedPromotion.discountValue, subtotal)
        : state.selectedPromotion?.discountType === 'percentage'
        ? subtotal * (state.selectedPromotion.discountValue / 100)
        : 0;
      const total = subtotal - discount;

      return {
        items: newItems,
        subtotal,
        discount,
        total,
      };
    });
  },

  updateQuantity: (id, quantity) => {
    set((state) => {
      const newItems = quantity <= 0 
        ? state.items.filter(item => item.id !== id)
        : state.items.map(item =>
            item.id === id ? { ...item, quantity, subtotal: quantity * item.price } : item
          );
      
      const subtotal = newItems.reduce((sum, item) => sum + item.subtotal, 0);
      const discount = state.selectedPromotion?.discountType === 'fixed' 
        ? Math.min(state.selectedPromotion.discountValue, subtotal)
        : state.selectedPromotion?.discountType === 'percentage'
        ? subtotal * (state.selectedPromotion.discountValue / 100)
        : 0;
      const total = subtotal - discount;

      return {
        items: newItems,
        subtotal,
        discount,
        total,
      };
    });
  },

  clearCart: () => {
    set({
      items: [],
      selectedPromotion: undefined,
      subtotal: 0,
      discount: 0,
      total: 0,
    });
  },

  applyPromotion: (promotion) => {
    set((state) => {
      const subtotal = state.subtotal;
      const discount = promotion?.discountType === 'fixed' 
        ? Math.min(promotion.discountValue, subtotal)
        : promotion?.discountType === 'percentage'
        ? subtotal * (promotion.discountValue / 100)
        : 0;
      const total = subtotal - discount;

      return {
        selectedPromotion: promotion,
        discount,
        total,
      };
    });
  },
}));

interface AppStore {
  currentPage: string;
  isLoading: boolean;
  error?: string;

  setCurrentPage: (page: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error?: string) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  currentPage: 'order',
  isLoading: false,
  error: undefined,

  setCurrentPage: (page: string) => set({ currentPage: page }),
  setLoading: (loading: boolean) => set({ isLoading: loading }),
  setError: (error?: string) => set({ error }),
}));
