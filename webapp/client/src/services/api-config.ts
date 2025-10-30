// Configuration for switching between local API and Google Sheets API
import { menuAPI, promotionAPI, orderAPI, reportAPI } from './api';
import { googleMenuAPI, googlePromotionAPI, googleOrderAPI, googleReportAPI } from './google-sheets-api';
import { MenuItem, Promotion, Order, SalesReport, ApiResponse } from '../types';

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

// local API (ผ่าน nginx → /api → pos-api)
const localMenuAPI = menuAPI;
const localPromotionAPI = promotionAPI;
const localOrderAPI = orderAPI;
const localReportAPI = reportAPI;

export const apiConfig: UnifiedAPI = {
  menu: USE_GOOGLE_SHEETS ? googleMenuAPI : localMenuAPI,
  promotion: USE_GOOGLE_SHEETS ? googlePromotionAPI : localPromotionAPI,
  order: USE_GOOGLE_SHEETS ? googleOrderAPI : localOrderAPI,
  report: USE_GOOGLE_SHEETS ? googleReportAPI : localReportAPI,
};

export default apiConfig;
