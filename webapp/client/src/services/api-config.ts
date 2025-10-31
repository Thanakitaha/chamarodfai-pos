// Configuration for switching between local API and Google Sheets API
import api, { promotionAPI } from './api';
import {
  googleMenuAPI,
  googlePromotionAPI,
  googleOrderAPI,
  googleReportAPI,
} from './google-sheets-api';
import type { MenuItem, Promotion, Order, SalesReport, ApiResponse } from '../types';

// ใช้ค่าจาก env (Vite) แทนฮาร์ดโค้ด: ตั้งใน .env => VITE_USE_SHEETS=false
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

/** LOCAL API wrappers (thin wrapper ผ่าน axios instance) */
const localMenuAPI = {
  getAll: async () => {
    const res = await api.get<ApiResponse<MenuItem[]>>('/menu-items');
    return res.data;
  },
  create: async (item: Omit<MenuItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    const res = await api.post<ApiResponse<MenuItem>>('/menu-items', item);
    return res.data;
  },
  update: async (id: string, item: Partial<MenuItem>) => {
    const res = await api.put<ApiResponse<MenuItem>>(`/menu-items/${id}`, item);
    return res.data;
  },
  delete: async (id: string) => {
    const res = await api.delete<ApiResponse<void>>(`/menu-items/${id}`);
    return res.data;
  },
};

const localPromotionAPI = {
  getAll: () => promotionAPI.list(false),
  create: promotionAPI.create,
  update: promotionAPI.update,
  remove: promotionAPI.remove,
  toggle: promotionAPI.toggle,
};

const localOrderAPI = {
  getAll: async () => {
    const res = await api.get<ApiResponse<Order[]>>('/orders');
    return res.data;
  },
  create: async (order: any) => {
    const res = await api.post<ApiResponse<Order>>('/orders', order);
    return res.data;
  },
  getNextOrderNumber: async () => {
    const res = await api.get<ApiResponse<{ orderNumber: string }>>('/orders/next-number');
    return res.data;
  },
};

const localReportAPI = {
  getSalesReport: async (period: string, date?: string) => {
    const res = await api.get<ApiResponse<SalesReport>>('/reports/sales', { params: { period, date } });
    return res.data;
  },
  getTrendData: async (days?: number) => {
    const res = await api.get<ApiResponse<{ date: string; revenue: number; orders: number }[]>>(
      '/reports/trend',
      { params: { days } }
    );
    return res.data;
  },
};

export const apiConfig: UnifiedAPI = {
  menu: USE_GOOGLE_SHEETS ? googleMenuAPI : localMenuAPI,
  promotion: USE_GOOGLE_SHEETS ? googlePromotionAPI : localPromotionAPI,
  order: USE_GOOGLE_SHEETS ? googleOrderAPI : localOrderAPI,
  report: USE_GOOGLE_SHEETS ? googleReportAPI : localReportAPI,
};

export default apiConfig;
