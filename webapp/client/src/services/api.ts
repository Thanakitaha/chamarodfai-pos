import axios from 'axios';
import type { ApiResponse } from '../types';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

const unwrap = async <T>(
  p: Promise<import('axios').AxiosResponse<ApiResponse<T>>>
): Promise<ApiResponse<T>> => (await p).data;

/* ===================== AUTH ===================== */
// ส่งแบบ form-urlencoded กันเหนียว กรณี backend ไม่ parse JSON
export const authAPI = {
  login: async (payload: { identifier: string; password: string }) => {
    const form = new URLSearchParams();
    form.set('identifier', payload.identifier?.trim() ?? '');
    form.set('password', payload.password ?? '');

    const res = await api.post<ApiResponse<{ token: string }>>('/auth/login', form.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    return res.data;
  },

  me: () => unwrap<{ username: string; role: string; email?: string }>(api.get('/auth/me')),
  logout: () => unwrap<{}>(api.post('/auth/logout', {})),
};

/* ===================== ORDERS ===================== */
export const orderAPI = {
  create: (payload: {
    items: { menuItemId: number; price: number; quantity: number }[];
    promotionId?: number | null;
    taxAmount?: number;
    serviceCharge?: number;
    status: 'open' | 'paid';
  }) => unwrap<{ id: number; orderNumber: string }>(api.post('/orders', payload)),

  getAll: () => unwrap<any[]>(api.get('/orders')),
  getNextOrderNumber: () => unwrap<{ orderNumber: string }>(api.get('/orders/next-number')),
};

// ===== Promotions =====
export const promotionAPI = {
  list: (onlyActive: boolean = false) =>
    unwrap<Promotion[]>(api.get('/promotions', { params: { onlyActive } })),

  create: (body: {
    name: string;
    description?: string;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    minOrderAmount?: number;
    startDate: string;
    endDate: string;
    active?: boolean;
  }) => unwrap<{ id: number }>(api.post('/promotions', body)),

  update: (id: number, body: {
    name: string;
    description?: string;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    minOrderAmount?: number;
    startDate: string;
    endDate: string;
    active?: boolean;
  }) => unwrap<{ message: string }>(api.put(`/promotions/${id}`, body)),

  remove: (id: number) =>
    unwrap<{ message: string }>(api.delete(`/promotions/${id}`)),

  toggle: (id: number) =>
    unwrap<{ active: boolean }>(api.patch(`/promotions/${id}/toggle`, {})),
};

export default api;
