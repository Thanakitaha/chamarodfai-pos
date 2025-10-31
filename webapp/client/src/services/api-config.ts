// webapp/client/src/services/api-config.ts
import api, { promotionAPI } from './api';
import {
  googleMenuAPI,
  googlePromotionAPI,
  googleOrderAPI,
  googleReportAPI,
} from './google-sheets-api';
import type { MenuItem, Promotion, Order, SalesReport, ApiResponse } from '../types';

const USE_GOOGLE_SHEETS = String(import.meta.env.VITE_USE_SHEETS || 'false') === 'true';

interface UnifiedAPI {
  menu: {
    getAll: () => Promise<ApiResponse<MenuItem[]>>;
    create: (item: Omit<MenuItem, 'id' | 'createdAt' | 'updatedAt'>) => Promise<ApiResponse<MenuItem>>;
    update: (id: string, item: Partial<MenuItem>) => Promise<ApiResponse<MenuItem>>;
    delete: (id: string) => Promise<ApiResponse<void>>;
  };
  promotion: {
    getAll: () => Promise<ApiResponse<Promotion[]>>;
    create?: (body: any) => Promise<ApiResponse<{ id: number }>>;
    update?: (id: number, body: any) => Promise<ApiResponse<{ message: string }>>;
    remove?: (id: number) => Promise<ApiResponse<{ message: string }>>;
    toggle?: (id: number) => Promise<ApiResponse<{ active: boolean }>>;
  };
  order: {
    getAll: () => Promise<ApiResponse<Order[]>>;
    create: (order: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'updatedAt'>) => Promise<ApiResponse<Order>>;
    getNextOrderNumber: () => Promise<ApiResponse<{ orderNumber: string }>>;
  };
  report: {
    getSalesReport: (period: string, date?: string) => Promise<ApiResponse<SalesReport>>;
    getTrendData: (days?: number) => Promise<ApiResponse<{ date: string; revenue: number; orders: number }[]>>;
  };
}

/** LOCAL API wrappers */
const localMenuAPI = {
  getAll: async () => (await api.get<ApiResponse<MenuItem[]>>('/menu-items')).data,
  create: async (item: Omit<MenuItem, 'id' | 'createdAt' | 'updatedAt'>) =>
    (await api.post<ApiResponse<MenuItem>>('/menu-items', item)).data,
  update: async (id: string, item: Partial<MenuItem>) =>
    (await api.put<ApiResponse<MenuItem>>(`/menu-items/${id}`, item)).data,
  delete: async (id: string) =>
    (await api.delete<ApiResponse<void>>(`/menu-items/${id}`)).data,
};

// ใช้ชุด promotionAPI ที่ export จาก ./api
const localPromotionAPI = {
  getAll: () => promotionAPI.list(false),
  create: promotionAPI.create,
  update: promotionAPI.update,
  remove: promotionAPI.remove,
  toggle: promotionAPI.toggle,
};

const localOrderAPI = {
  getAll: async () => (await api.get<ApiResponse<Order[]>>('/orders')).data,
  create: async (order: any) =>
    (await api.post<ApiResponse<Order>>('/orders', order)).data,
  getNextOrderNumber: async () =>
    (await api.get<ApiResponse<{ orderNumber: string }>>('/orders/next-number')).data,
};

const localReportAPI = {
  getSalesReport: async (period: string, date?: string) =>
    (await api.get<ApiResponse<SalesReport>>('/reports/sales', { params: { period, date } })).data,
  getTrendData: async (days?: number) =>
    (await api.get<ApiResponse<{ date: string; revenue: number; orders: number }[]>>('/reports/trend', { params: { days } })).data,
};

export const apiConfig: UnifiedAPI = {
  menu: USE_GOOGLE_SHEETS ? googleMenuAPI : localMenuAPI,
  promotion: USE_GOOGLE_SHEETS ? googlePromotionAPI : localPromotionAPI,
  order: USE_GOOGLE_SHEETS ? googleOrderAPI : localOrderAPI,
  report: USE_GOOGLE_SHEETS ? googleReportAPI : localReportAPI,
};

export default apiConfig;
