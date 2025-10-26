import { MenuItem, Promotion, Order, SalesReport, ApiResponse } from '../types';

// Google Apps Script API URL
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwPY7wJe7W-VwiguoROToQk_KPSGFdISvb-kbV_DCcEp2tXB9laW0CJrCRpA2lEa4yeMg/exec';

// JSONP helper function สำหรับ Google Apps Script
function makeJSONPRequest(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const callbackName = 'jsonp_callback_' + Math.round(100000 * Math.random());
    const separator = url.indexOf('?') !== -1 ? '&' : '?';
    const finalUrl = url + separator + 'callback=' + callbackName;

    const script = document.createElement('script');
    script.src = finalUrl;

    // สร้าง callback function
    (window as any)[callbackName] = function(data: any) {
      resolve(data);
      try {
        document.head.removeChild(script);
      } catch (e) {
        console.log('Error removing script:', e);
      }
      delete (window as any)[callbackName];
    };

    // Handle errors
    script.onerror = function() {
      reject(new Error('JSONP request failed'));
      try {
        document.head.removeChild(script);
      } catch (e) {
        console.log('Error removing script:', e);
      }
      delete (window as any)[callbackName];
    };

    document.head.appendChild(script);

    // Timeout after 10 seconds
    setTimeout(() => {
      if ((window as any)[callbackName]) {
        reject(new Error('JSONP request timeout'));
        try {
          document.head.removeChild(script);
        } catch (e) {
          console.log('Error removing script:', e);
        }
        delete (window as any)[callbackName];
      }
    }, 10000);
  });
}

// Helper function to format response
function createApiResponse<T>(googleResponse: any): ApiResponse<T> {
  return {
    success: googleResponse.success,
    message: googleResponse.message,
    data: googleResponse.data
  };
}

// Menu Items API for Google Sheets
export const googleMenuAPI = {
  getAll: async (): Promise<ApiResponse<MenuItem[]>> => {
    try {
      const url = `${GOOGLE_SCRIPT_URL}?action=getMenuItems`;
      const response = await makeJSONPRequest(url);
      return createApiResponse<MenuItem[]>(response);
    } catch (error) {
      return {
        success: false,
        message: 'Failed to get menu items: ' + (error as Error).message,
        data: []
      };
    }
  },

  create: async (item: Omit<MenuItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<MenuItem>> => {
    try {
      const params = new URLSearchParams({
        action: 'createMenuItem',
        name: item.name,
        price: item.price.toString(),
        cost: item.cost.toString(),
        category: item.category,
        description: item.description || '',
        image: item.image || '',
        available: item.available.toString()
      });
      
      const url = `${GOOGLE_SCRIPT_URL}?${params.toString()}`;
      const response = await makeJSONPRequest(url);
      return createApiResponse<MenuItem>(response);
    } catch (error) {
      return {
        success: false,
        message: 'Failed to create menu item: ' + (error as Error).message
      };
    }
  },

  update: async (id: string, item: Partial<MenuItem>): Promise<ApiResponse<MenuItem>> => {
    try {
      const params = new URLSearchParams({
        action: 'updateMenuItem',
        id: id,
        name: item.name || '',
        price: item.price?.toString() || '',
        cost: item.cost?.toString() || '',
        category: item.category || '',
        description: item.description || '',
        image: item.image || '',
        available: item.available?.toString() || 'true'
      });
      
      const url = `${GOOGLE_SCRIPT_URL}?${params.toString()}`;
      const response = await makeJSONPRequest(url);
      
      if (response.success && response.data) {
        return {
          success: true,
          data: {
            id: response.data.id,
            name: response.data.name,
            price: parseFloat(response.data.price),
            cost: parseFloat(response.data.cost) || 0,
            category: response.data.category,
            description: response.data.description,
            image: response.data.image,
            available: response.data.available === 'true' || response.data.available === true,
            createdAt: response.data.createdAt || new Date().toISOString(),
            updatedAt: response.data.updatedAt || new Date().toISOString()
          },
          message: response.message
        };
      } else {
        return {
          success: false,
          message: response.message || 'ไม่สามารถอัปเดตเมนูได้'
        };
      }
    } catch (error) {
      console.error('Error updating menu item:', error);
      return {
        success: false,
        message: 'เกิดข้อผิดพลาดในการอัปเดตเมนู'
      };
    }
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    try {
      const params = new URLSearchParams({
        action: 'deleteMenuItem',
        id: id
      });
      
      const url = `${GOOGLE_SCRIPT_URL}?${params.toString()}`;
      const response = await makeJSONPRequest(url);
      
      return {
        success: response.success,
        message: response.message || (response.success ? 'ลบเมนูสำเร็จ' : 'ไม่สามารถลบเมนูได้')
      };
    } catch (error) {
      console.error('Error deleting menu item:', error);
      return {
        success: false,
        message: 'เกิดข้อผิดพลาดในการลบเมนู'
      };
    }
  }
};

// Promotions API for Google Sheets
export const googlePromotionAPI = {
  getAll: async (): Promise<ApiResponse<Promotion[]>> => {
    try {
      const url = `${GOOGLE_SCRIPT_URL}?action=getPromotions`;
      const response = await makeJSONPRequest(url);
      return createApiResponse<Promotion[]>(response);
    } catch (error) {
      return {
        success: false,
        message: 'Failed to get promotions: ' + (error as Error).message,
        data: []
      };
    }
  }
};

// Orders API for Google Sheets
export const googleOrderAPI = {
  getAll: async (): Promise<ApiResponse<Order[]>> => {
    try {
      const url = `${GOOGLE_SCRIPT_URL}?action=getOrders`;
      const response = await makeJSONPRequest(url);
      return createApiResponse<Order[]>(response);
    } catch (error) {
      return {
        success: false,
        message: 'Failed to get orders: ' + (error as Error).message,
        data: []
      };
    }
  },

  create: async (order: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Order>> => {
    try {
      const params = new URLSearchParams({
        action: 'createOrder',
        orderData: JSON.stringify({
          items: order.items,
          discount: order.discount,
          status: order.status || 'pending'
        })
      });
      
      const url = `${GOOGLE_SCRIPT_URL}?${params.toString()}`;
      const response = await makeJSONPRequest(url);
      return createApiResponse<Order>(response);
    } catch (error) {
      return {
        success: false,
        message: 'Failed to create order: ' + (error as Error).message
      };
    }
  },

  getNextOrderNumber: async (): Promise<ApiResponse<{ orderNumber: string }>> => {
    // สร้างเลขออเดอร์จาก timestamp
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    const orderNumber = `${year}${month}${day}${hours}${minutes}${seconds}`;
    
    return {
      success: true,
      message: 'Order number generated',
      data: { orderNumber }
    };
  }
};

// Reports API for Google Sheets
export const googleReportAPI = {
  getSalesReport: async (period: string, date?: string): Promise<ApiResponse<SalesReport>> => {
    try {
      console.log('getSalesReport called with:', period, date);
      
      // ดึงข้อมูลออเดอร์ทั้งหมดมาคำนวณเอง
      const ordersResponse = await googleOrderAPI.getAll();
      console.log('Orders response:', ordersResponse);
      
      if (!ordersResponse.success || !ordersResponse.data) {
        console.log('No orders data available');
        return {
          success: true,
          message: 'No orders found',
          data: {
            period,
            date: date || new Date().toISOString().split('T')[0],
            totalOrders: 0,
            totalRevenue: 0,
            totalProfit: 0,
            topSellingItems: []
          }
        };
      }

      const orders = ordersResponse.data;
      console.log('Total orders found:', orders.length);
      
      const targetDate = date || new Date().toISOString().split('T')[0];
      console.log('Target date for filtering:', targetDate);
      
      // กรองออเดอร์ตามวันที่
      const filteredOrders = orders.filter(order => {
        if (!order.createdAt) return false;
        
        // แปลงวันที่จาก Google Sheets ให้เป็นรูปแบบ ISO
        let orderDate;
        try {
          // ลองแปลงวันที่หลายรูปแบบ
          if (typeof order.createdAt === 'string' && order.createdAt.includes('/')) {
            // รูปแบบ "8/8/2568 12:40:52" หรือคล้ายๆ
            const dateParts = order.createdAt.split(' ')[0].split('/');
            if (dateParts.length === 3) {
              const day = dateParts[0].padStart(2, '0');
              const month = dateParts[1].padStart(2, '0');
              let year = dateParts[2];
              
              // แปลงปี พ.ศ. เป็น ค.ศ. ถ้าเป็นปี 25xx
              if (year.startsWith('25')) {
                year = (parseInt(year) - 543).toString();
              }
              
              orderDate = `${year}-${month}-${day}`;
            } else {
              orderDate = new Date(order.createdAt).toISOString().split('T')[0];
            }
          } else {
            orderDate = new Date(order.createdAt).toISOString().split('T')[0];
          }
        } catch (e) {
          console.error('Error parsing date:', order.createdAt, e);
          return false;
        }
        
        const matches = orderDate === targetDate;
        console.log(`Order ${order.id}: ${order.createdAt} -> ${orderDate} matches ${targetDate}? ${matches}`);
        return matches;
      });

      console.log('Filtered orders:', filteredOrders.length);

      // คำนวณข้อมูลรายงาน
      const totalOrders = filteredOrders.length;
      const totalRevenue = filteredOrders.reduce((sum, order) => sum + (order.total || 0), 0);
      
      console.log('Calculated totals:', { totalOrders, totalRevenue });
      
      // คำนวณรายการที่ขายดีที่สุด
      const itemSales: { [key: string]: { name: string, quantity: number, revenue: number } } = {};
      
      filteredOrders.forEach(order => {
        if (order.items) {
          order.items.forEach(item => {
            const key = item.menuItemId || 'Unknown';
            const name = item.menuItem?.name || `Item ${item.menuItemId}` || 'Unknown Item';
            
            if (!itemSales[key]) {
              itemSales[key] = { name, quantity: 0, revenue: 0 };
            }
            
            itemSales[key].quantity += item.quantity || 0;
            itemSales[key].revenue += (item.quantity || 0) * (item.price || 0);
          });
        }
      });

      // เรียงลำดับรายการที่ขายดีที่สุด
      const topSellingItems = Object.values(itemSales)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5)
        .map(item => ({
          name: item.name,
          quantity: item.quantity,
          revenue: item.revenue
        }));

      const salesReport: SalesReport = {
        period,
        date: targetDate,
        totalOrders,
        totalRevenue,
        totalProfit: totalRevenue * 0.3, // ประมาณการกำไร 30%
        topSellingItems
      };

      console.log('Final sales report:', salesReport);

      return {
        success: true,
        message: 'Sales report generated successfully',
        data: salesReport
      };
    } catch (error) {
      console.error('Error in getSalesReport:', error);
      return {
        success: false,
        message: 'Failed to get sales report: ' + (error as Error).message
      };
    }
  },

  // เพิ่มฟังก์ชันสำหรับดึงข้อมูล trend
  getTrendData: async (days: number = 7): Promise<ApiResponse<{ date: string, revenue: number, orders: number }[]>> => {
    try {
      const ordersResponse = await googleOrderAPI.getAll();
      
      if (!ordersResponse.success || !ordersResponse.data) {
        return {
          success: true,
          message: 'No orders found',
          data: []
        };
      }

      const orders = ordersResponse.data;
      const today = new Date();
      const trendData: { [key: string]: { revenue: number, orders: number } } = {};

      // สร้างข้อมูลสำหรับ x วันที่ผ่านมา
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        trendData[dateStr] = { revenue: 0, orders: 0 };
      }

      // คำนวณข้อมูลจากออเดอร์
      orders.forEach(order => {
        if (!order.createdAt) return;

        let orderDate;
        try {
          if (typeof order.createdAt === 'string' && order.createdAt.includes('/')) {
            const dateParts = order.createdAt.split(' ')[0].split('/');
            if (dateParts.length === 3) {
              const day = dateParts[0].padStart(2, '0');
              const month = dateParts[1].padStart(2, '0');
              let year = dateParts[2];
              
              if (year.startsWith('25')) {
                year = (parseInt(year) - 543).toString();
              }
              
              orderDate = `${year}-${month}-${day}`;
            } else {
              orderDate = new Date(order.createdAt).toISOString().split('T')[0];
            }
          } else {
            orderDate = new Date(order.createdAt).toISOString().split('T')[0];
          }

          if (trendData[orderDate]) {
            trendData[orderDate].revenue += order.total || 0;
            trendData[orderDate].orders += 1;
          }
        } catch (e) {
          console.error('Error parsing date:', order.createdAt, e);
        }
      });

      // แปลงเป็น array
      const result = Object.entries(trendData).map(([date, data]) => ({
        date,
        revenue: data.revenue,
        orders: data.orders
      }));

      return {
        success: true,
        message: 'Trend data retrieved successfully',
        data: result
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to get trend data: ' + (error as Error).message,
        data: []
      };
    }
  }
};

// Export all APIs as default for easy switching
export const googleSheetsAPI = {
  menu: googleMenuAPI,
  promotion: googlePromotionAPI,
  order: googleOrderAPI,
  report: googleReportAPI
};

export default googleSheetsAPI;
