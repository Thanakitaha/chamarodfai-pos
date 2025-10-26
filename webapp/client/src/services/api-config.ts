// Configuration for switching between local API and Google Sheets API
import { menuAPI, promotionAPI, orderAPI, reportAPI } from './api';
import { googleMenuAPI, googlePromotionAPI, googleOrderAPI, googleReportAPI } from './google-sheets-api';
import { MenuItem, Promotion, Order, SalesReport, ApiResponse } from '../types';

// สำหรับเปลี่ยนระหว่าง Local API และ Google Sheets API
const USE_GOOGLE_SHEETS = true; // เปลี่ยนเป็น true เพื่อใช้ Google Sheets, false เพื่อใช้ local API

// Type definitions for unified API interface
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
    getTrendData: (days?: number) => Promise<ApiResponse<{ date: string, revenue: number, orders: number }[]>>;
  };
}

// Function to create unified response from axios response for local API
function createUnifiedResponse<T>(axiosResponse: any): ApiResponse<T> {
  return {
    success: axiosResponse.data?.success || true,
    message: axiosResponse.data?.message || '',
    data: axiosResponse.data?.data || axiosResponse.data
  };
}

// Wrapper functions for local API to match Google Sheets API structure
const localMenuAPI = {
  getAll: async (): Promise<ApiResponse<MenuItem[]>> => {
    try {
      const response = await menuAPI.getAll();
      return createUnifiedResponse<MenuItem[]>(response);
    } catch (error) {
      return { success: false, message: 'Failed to get menu items', data: [] };
    }
  },
  create: async (item: Omit<MenuItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<MenuItem>> => {
    try {
      const response = await menuAPI.create(item);
      return createUnifiedResponse<MenuItem>(response);
    } catch (error) {
      return { success: false, message: 'Failed to create menu item' };
    }
  },
  update: async (id: string, item: Partial<MenuItem>): Promise<ApiResponse<MenuItem>> => {
    try {
      const response = await menuAPI.update(id, item);
      return createUnifiedResponse<MenuItem>(response);
    } catch (error) {
      return { success: false, message: 'Failed to update menu item' };
    }
  },
  delete: async (id: string): Promise<ApiResponse<void>> => {
    try {
      const response = await menuAPI.delete(id);
      return createUnifiedResponse<void>(response);
    } catch (error) {
      return { success: false, message: 'Failed to delete menu item' };
    }
  }
};

const localPromotionAPI = {
  getAll: async (): Promise<ApiResponse<Promotion[]>> => {
    try {
      const response = await promotionAPI.getAll();
      return createUnifiedResponse<Promotion[]>(response);
    } catch (error) {
      return { success: false, message: 'Failed to get promotions', data: [] };
    }
  }
};

const localOrderAPI = {
  getAll: async (): Promise<ApiResponse<Order[]>> => {
    try {
      const response = await orderAPI.getAll();
      return createUnifiedResponse<Order[]>(response);
    } catch (error) {
      return { success: false, message: 'Failed to get orders', data: [] };
    }
  },
  create: async (order: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Order>> => {
    try {
      const response = await orderAPI.create(order);
      return createUnifiedResponse<Order>(response);
    } catch (error) {
      return { success: false, message: 'Failed to create order' };
    }
  },
  getNextOrderNumber: async (): Promise<ApiResponse<{ orderNumber: string }>> => {
    try {
      const response = await orderAPI.getNextOrderNumber();
      return createUnifiedResponse<{ orderNumber: string }>(response);
    } catch (error) {
      return { success: false, message: 'Failed to get order number' };
    }
  }
};

const localReportAPI = {
  getSalesReport: async (period: string, date?: string): Promise<ApiResponse<SalesReport>> => {
    try {
      const response = await reportAPI.getSalesReport(period, date);
      return createUnifiedResponse<SalesReport>(response);
    } catch (error) {
      return { success: false, message: 'Failed to get sales report' };
    }
  },
  getTrendData: async (_days?: number): Promise<ApiResponse<{ date: string, revenue: number, orders: number }[]>> => {
    // สำหรับ local API จะใช้ข้อมูลจำลอง
    return {
      success: true,
      message: 'Trend data generated',
      data: []
    };
  }
};

export const apiConfig: UnifiedAPI = {
  menu: USE_GOOGLE_SHEETS ? googleMenuAPI : localMenuAPI,
  promotion: USE_GOOGLE_SHEETS ? googlePromotionAPI : localPromotionAPI,
  order: USE_GOOGLE_SHEETS ? googleOrderAPI : localOrderAPI,
  report: USE_GOOGLE_SHEETS ? googleReportAPI : localReportAPI
};

export default apiConfig;
