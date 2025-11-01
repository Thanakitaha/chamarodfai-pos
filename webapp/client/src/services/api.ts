// webapp/client/src/services/api.ts
import axios from 'axios';
import type { ApiResponse, Promotion } from '../types';

// ===== Axios instance (รองรับ session cookie + JWT) =====
const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // 👈 สำคัญมากถ้า backend ใช้ session cookie (HttpOnly)
});

// แนบ Authorization header อัตโนมัติถ้ามี token ใน localStorage
api.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers = config.headers ?? {};
      (config.headers as any).Authorization = `Bearer ${token}`;
    }
  } catch {
    // ignore
  }
  return config;
});

// ดัก 401 เพื่อง่ายต่อการจัดการ (ถ้าต้องการจะเพิ่ม logic logout ที่นี่ได้)
api.interceptors.response.use(
  (res) => res,
  (err) => Promise.reject(err)
);

// helper: ดึง data ออกมาแบบ typed
const unwrap = async <T>(
  p: Promise<import('axios').AxiosResponse<ApiResponse<T>>>
): Promise<ApiResponse<T>> => (await p).data;

/* ===================== AUTH ===================== */
export const authAPI = {
  /**
   * รองรับทั้ง 2 รูปแบบ body:
   * 1) JSON: { identifier, username, password }
   * 2) x-www-form-urlencoded: identifier=username, username, password
   *
   * และรองรับทั้ง 2 แบบของ response:
   * - { success: true, data: { token, ... } }
   * - { success: true, data: { account_id, store_id, role, email, username } } // ไม่มี token (session)
   */
  login: async (payload: { identifierOrUsername: string; password: string }) => {
    const id = (payload.identifierOrUsername ?? '').trim();
    const pw = payload.password ?? '';

    // 1) ลอง JSON ก่อน
    try {
      const jsonBody = { identifier: id, username: id, password: pw };
      const jsonRes = await api.post<ApiResponse<any>>('/auth/login', jsonBody, {
        headers: { 'Content-Type': 'application/json' },
        // ให้รับ response แม้ status 4xx เพื่ออ่าน message ได้
        validateStatus: (s) => s < 500,
      });
      // ถ้า success จริงก็คืนเลย
      if (jsonRes.data?.success) return jsonRes.data;
      // ถ้าไม่ success ลอง fallback เป็น form ต่อไป
    } catch {
      // เงียบ ๆ แล้วไปลองแบบ form
    }

    // 2) Fallback: x-www-form-urlencoded
    const form = new URLSearchParams();
    form.set('identifier', id);
    form.set('username', id);
    form.set('password', pw);

    const formRes = await api.post<ApiResponse<any>>('/auth/login', form.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      validateStatus: (s) => s < 500,
    });
    return formRes.data;
  },

  /**
   * ควรให้ backend ส่งข้อมูลผู้ใช้กลับมา เช่น:
   * { success: true, data: { account_id, store_id, role, email, username } }
   */
  me: () =>
    unwrap<{
      account_id: number | string;
      store_id: number | string;
      role: string;
      email: string;
      username?: string | null;
    }>(api.get('/auth/me')),

  logout: () => unwrap<{}>(api.post('/auth/logout', {})),
};

/* ===================== PROMOTIONS ===================== */
export const promotionAPI = {
  // onlyActive=true จะ filter เฉพาะ active
  list: (onlyActive = true) =>
    unwrap<Promotion[]>(api.get('/promotions', { params: { onlyActive } })),

  create: (body: {
    name: string;
    description?: string | null;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    minOrderAmount?: number | null;
    startDate: string; // ISO
    endDate: string; // ISO
    active?: boolean;
  }) => unwrap<{ id: number }>(api.post('/promotions', body)),

  update: (
    id: number,
    body: {
      name: string;
      description?: string | null;
      discountType: 'percentage' | 'fixed';
      discountValue: number;
      minOrderAmount?: number | null;
      startDate: string; // ISO
      endDate: string; // ISO
      active?: boolean;
    }
  ) => unwrap<{ message: string }>(api.put(`/promotions/${id}`, body)),

  remove: (id: number) => unwrap<{ message: string }>(api.delete(`/promotions/${id}`)),

  toggle: (id: number) => unwrap<{ active: boolean }>(api.patch(`/promotions/${id}/toggle`, {})),
};

/* ===================== ORDERS ===================== */
export const orderAPI = {
  create: (payload: {
    items: { menuItemId: number; price: number; quantity: number; note?: string }[];
    promotionId?: number | null;
    taxAmount?: number;
    serviceCharge?: number;
    status: 'open' | 'paid';
  }) => unwrap<{ id: number; orderNumber: string }>(api.post('/orders', payload)),

  getAll: () => unwrap<any[]>(api.get('/orders')),
  getNextOrderNumber: () => unwrap<{ orderNumber: string }>(api.get('/orders/next-number')),
};

export default api;
