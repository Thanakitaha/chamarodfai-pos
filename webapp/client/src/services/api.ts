import axios from 'axios';
import { MenuItem, Promotion, Order, SalesReport, ApiResponse } from '../types';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// helper: unwrap AxiosResponse<ApiResponse<T>> -> ApiResponse<T>
const unwrap = async <T>(p: Promise<import('axios').AxiosResponse<ApiResponse<T>>>)
  : Promise<ApiResponse<T>> => (await p).data;

// ===== Auth =====
export async function login(identifier: string, password: string): Promise<ApiResponse<any>> {
  return unwrap(api.post<ApiResponse<any>>('/auth/login', { identifier, password }));
}

// ===== Menu =====
export const menuAPI = {
  getAll: () => unwrap<MenuItem[]>(api.get('/menu-items')),
  create: (item: Omit<MenuItem, 'id' | 'createdAt' | 'updatedAt'>) =>
    unwrap<MenuItem>(api.post('/menu-items', item)),
  update: (id: string, item: Partial<MenuItem>) =>
    unwrap<MenuItem>(api.put(`/menu-items/${id}`, item)),
  delete: (id: string) =>
    unwrap<void>(api.delete(`/menu-items/${id}`)),
};

// ===== Promotion =====
export const promotionAPI = {
  getAll: () => unwrap<Promotion[]>(api.get('/promotions')),
};

// ===== Order =====
export const orderAPI = {
  getAll: () => unwrap<Order[]>(api.get('/orders')),
  // ✅ ฝั่ง client ไม่ต้องส่ง orderNumber (ให้ backend สร้าง)
  create: (order: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'updatedAt'>) =>
    unwrap<Order>(api.post('/orders', order)),
  getNextOrderNumber: () =>
    unwrap<{ orderNumber: string }>(api.get('/orders/next-number')),
};

// ===== Report =====
export const reportAPI = {
  getSalesReport: (period: string, date?: string) =>
    unwrap<SalesReport>(api.get('/reports/sales', { params: { period, date } })),
  // ถ้ามี endpoint trends ที่ backend: /reports/trends?days=7
  getTrendData: (days: number = 7) =>
    unwrap<{ date: string; revenue: number; orders: number }[]>(
      api.get('/reports/trends', { params: { days } })
    ),
};

export default api;
