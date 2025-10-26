import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, DollarSign, ShoppingBag, Calendar } from 'lucide-react';
import apiConfig from '../services/api-config';
import SalesTrendChart from '../components/SalesTrendChart';
import { SalesReport } from '../types';

const ReportsPage: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('daily');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportData, setReportData] = useState<SalesReport | null>(null);
  const [trendData, setTrendData] = useState<{ date: string, revenue: number, orders: number }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchReport();
    fetchTrendData();
  }, [selectedPeriod, selectedDate]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      console.log('Fetching report for:', selectedPeriod, selectedDate);
      const response = await apiConfig.report.getSalesReport(selectedPeriod, selectedDate);
      console.log('Report response:', response);
      
      if (response.success && response.data) {
        console.log('Report data:', response.data);
        setReportData(response.data);
      } else {
        console.log('Failed to get report:', response.message);
        // สร้างข้อมูลตัวอย่างถ้าไม่มีข้อมูล
        setReportData({
          period: selectedPeriod,
          date: selectedDate,
          totalOrders: 0,
          totalRevenue: 0,
          totalProfit: 0,
          topSellingItems: []
        });
      }
    } catch (error) {
      console.error('Error fetching report:', error);
      // สร้างข้อมูลตัวอย่างถ้าเกิด error
      setReportData({
        period: selectedPeriod,
        date: selectedDate,
        totalOrders: 0,
        totalRevenue: 0,
        totalProfit: 0,
        topSellingItems: []
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTrendData = async () => {
    try {
      const response = await apiConfig.report.getTrendData(7); // ข้อมูล 7 วันที่ผ่านมา
      if (response.success && response.data) {
        setTrendData(response.data);
      }
    } catch (error) {
      console.error('Error fetching trend data:', error);
    }
  };

  const periodOptions = [
    { value: 'daily', label: 'รายวัน' },
    { value: 'weekly', label: 'รายสัปดาห์' },
    { value: 'monthly', label: 'รายเดือน' },
    { value: 'yearly', label: 'รายปี' }
  ];

  return (
    <div className="p-3 sm:p-4 lg:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-3 sm:gap-0">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">รายงานการขาย</h1>
        
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
          >
            {periodOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : reportData ? (
        <div className="space-y-4 sm:space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="p-2 sm:p-3 bg-blue-100 rounded-lg">
                  <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">จำนวนออเดอร์</p>
                  <p className="text-lg sm:text-2xl font-bold text-gray-800">{reportData.totalOrders}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="p-2 sm:p-3 bg-green-100 rounded-lg">
                  <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">ยอดขายรวม</p>
                  <p className="text-lg sm:text-2xl font-bold text-gray-800">฿{reportData.totalRevenue.toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="p-2 sm:p-3 bg-yellow-100 rounded-lg">
                  <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">กำไรรวม</p>
                  <p className="text-lg sm:text-2xl font-bold text-gray-800">฿{reportData.totalProfit.toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="p-2 sm:p-3 bg-purple-100 rounded-lg">
                  <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">ยอดขายเฉลี่ย</p>
                  <p className="text-lg sm:text-2xl font-bold text-gray-800">
                    ฿{reportData.totalOrders > 0 ? (reportData.totalRevenue / reportData.totalOrders).toFixed(2) : '0.00'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Sales Trend Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <SalesTrendChart
              data={trendData}
              type="line"
              dataKey="revenue"
              title="แนวโน้มยอดขาย (7 วันที่ผ่านมา)"
              color="#10B981"
            />
            <SalesTrendChart
              data={trendData}
              type="bar"
              dataKey="orders"
              title="แนวโน้มจำนวนออเดอร์ (7 วันที่ผ่านมา)"
              color="#3B82F6"
            />
          </div>

          {/* Top Selling Items */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
              สินค้าขายดี
            </h3>
            
            {reportData.topSellingItems && reportData.topSellingItems.length > 0 ? (
              <div className="space-y-2 sm:space-y-3">
                {reportData.topSellingItems.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-xs sm:text-sm font-bold text-blue-600">#{index + 1}</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-800 text-sm sm:text-base">{item.name}</p>
                        <p className="text-xs sm:text-sm text-gray-600">ขายได้ {item.quantity} รายการ</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-800 text-sm sm:text-base">฿{item.revenue.toFixed(2)}</p>
                      <p className="text-sm text-gray-600">รายได้</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">ไม่มีข้อมูลสินค้าขายดี</p>
            )}
          </div>

          {/* Period Info */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-800">ข้อมูลรายงาน</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">ประเภทรายงาน</p>
                <p className="font-medium text-gray-800">
                  {periodOptions.find(p => p.value === selectedPeriod)?.label}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">วันที่</p>
                <p className="font-medium text-gray-800">{reportData.date}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">อัปเดตล่าสุด</p>
                <p className="font-medium text-gray-800">
                  {new Date().toLocaleString('th-TH')}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-800 mb-2">ไม่มีข้อมูลรายงาน</h3>
          <p className="text-gray-600">ไม่พบข้อมูลการขายในช่วงเวลาที่เลือก</p>
        </div>
      )}
    </div>
  );
};

export default ReportsPage;
