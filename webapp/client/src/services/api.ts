// webapp/client/src/services/api.ts
import axios from 'axios';
import type { ApiResponse, Promotion } from '../types';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

const unwrap = async <T>(
  p: Promise<import('axios').AxiosResponse<ApiResponse<T>>>
): Promise<ApiResponse<T>> => (await p).data;

/* ===================== AUTH ===================== */
export const authAPI = {
  login: async (payload: { identifierOrUsername: string; password: string }) => {
    const id = (payload.identifierOrUsername ?? '').trim();
    const pw = payload.password ?? '';

    // 1) JSON first
    try {
      const jsonBody = { identifier: id, username: id, password: pw };
      const jsonRes = await api.post<ApiResponse<{ token: string }>>('/auth/login', jsonBody, {
        headers: { 'Content-Type': 'application/json' },
      });
      if (!(jsonRes.data && jsonRes.data.success === false && /missing identifier|password/i.test(jsonRes.data.message || ''))) {
        return jsonRes.data;
      }
    } catch {
      // fallthrough to form
    }

    // 2) Fallback: x-www-form-urlencoded
    const form = new URLSearchParams();
    form.set('identifier', id);
    form.set('username', id);
    form.set('password', pw);

    const formRes = await api.post<ApiResponse<{ token: string }>>('/auth/login', form.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    return formRes.data;
  },

  me: () => unwrap<{ username: string; role: string; email?: string }>(api.get('/auth/me')),
  logout: () => unwrap<{}>(api.post('/auth/logout', {})),
};

/* ===================== PROMOTIONS ===================== */
// 🔹 Named export ที่หายไป — ใส่คืนให้เรียกจากหลายไฟล์ได้
export const promotionAPI = {
  // onlyActive: true = list เฉพาะที่ active
  list: (onlyActive = true) =>
    unwrap<Promotion[]>(api.get('/promotions', { params: { onlyActive } })),

  create: (body: {
    name: string;
    description?: string | null;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    minOrderAmount?: number | null;
    startDate: string; // ISO
    endDate: string;   // ISO
    active?: boolean;
  }) => unwrap<{ id: number }>(api.post('/promotions', body)),

  update: (id: number, body: {
    name: string;
    description?: string | null;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    minOrderAmount?: number | null;
    startDate: string; // ISO
    endDate: string;   // ISO
    active?: boolean;
  }) => unwrap<{ message: string }>(api.put(`/promotions/${id}`, body)),

  remove: (id: number) =>
    unwrap<{ message: string }>(api.delete(`/promotions/${id}`)),

  toggle: (id: number) =>
    unwrap<{ active: boolean }>(api.patch(`/promotions/${id}/toggle`, {})),
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

export default api;
