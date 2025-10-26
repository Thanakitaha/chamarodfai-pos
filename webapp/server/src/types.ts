// src/types.ts
export type MenuItem = {
  id: number;
  name: string;
  price: number;
  cost: number;
  category?: string | null;
  categoryId?: number | null;
  description?: string | null;
  image?: string | null;
  available: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type Promotion = {
  id: number;
  name: string;
  description?: string | null;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  minOrderAmount: number;
  startDate: string;
  endDate: string;
  active: boolean;
};

export type OrderItemInput = {
  menuItemId: number;
  quantity: number;
  price: number;
  discount?: number;
  taxAmount?: number;
  subtotal: number;
  note?: string;
};

export type PaymentInput = {
  method: 'cash' | 'card' | 'ewallet' | 'transfer' | 'other';
  amount: number;
  reference?: string;
};

export type OrderCreateRequest = {
  customerId?: number | null;
  cashierId?: number | null;
  items: OrderItemInput[];
  promotionId?: number | null;
  taxAmount?: number;
  serviceCharge?: number;
  discount?: number;
  subtotal: number;
  total: number;
  status?: 'open' | 'paid' | 'draft' | 'voided' | 'refunded';
  payments?: PaymentInput[];
};

export type OrderRow = {
  id: number;
  orderNumber: string;
  subtotal: number;
  discount: number;
  promotionId: number | null;
  taxAmount: number;
  serviceCharge: number;
  total: number;
  status: string;
  createdAt: string;
};
