import axios from 'axios';
import { MenuItem, Promotion, Order, SalesReport, ApiResponse } from '../types';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Login API
export async function login(identifier: string, password: string) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password })
  });
  return handle(res);
}

// Menu Items API
export const menuAPI = {
  getAll: () => api.get<ApiResponse<MenuItem[]>>('/menu-items'),
  create: (item: Omit<MenuItem, 'id' | 'createdAt' | 'updatedAt'>) => 
    api.post<ApiResponse<MenuItem>>('/menu-items', item),
  update: (id: string, item: Partial<MenuItem>) => 
    api.put<ApiResponse<MenuItem>>(`/menu-items/${id}`, item),
  delete: (id: string) => 
    api.delete<ApiResponse<void>>(`/menu-items/${id}`),
};

// Promotions API
export const promotionAPI = {
  getAll: () => api.get<ApiResponse<Promotion[]>>('/promotions'),
};

// Orders API
export const orderAPI = {
  getAll: () => api.get<ApiResponse<Order[]>>('/orders'),
  create: (order: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'updatedAt'>) => 
    api.post<ApiResponse<Order>>('/orders', order),
  getNextOrderNumber: () => 
    api.get<ApiResponse<{ orderNumber: string }>>('/orders/next-number'),
};

// Reports API
export const reportAPI = {
  getSalesReport: (period: string, date?: string) => 
    api.get<ApiResponse<SalesReport>>('/reports/sales', { 
      params: { period, date } 
    }),
};

export default api;
