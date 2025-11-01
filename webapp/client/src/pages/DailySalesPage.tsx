import React, { useState, useEffect } from 'react';
import { Calendar, TrendingUp } from 'lucide-react';
import apiConfig from '../services/api-config';
import { SalesReport } from '../types';

const normalizeReport = (raw: Partial<SalesReport> | null | undefined, date: string): SalesReport => {
  return {
    period: 'daily',
    date: raw?.date ?? date,
    totalOrders: Number(raw?.totalOrders ?? 0),
    totalRevenue: Number(raw?.totalRevenue ?? 0),
    totalProfit: Number(raw?.totalProfit ?? 0),
    topSellingItems: Array.isArray(raw?.topSellingItems)
      ? raw!.topSellingItems.map(it => ({
          name: it?.name ?? '-',
          quantity: Number((it as any)?.quantity ?? 0),
          revenue: Number((it as any)?.revenue ?? 0),
        }))
      : [],
  };
};

const DailySalesPage: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [salesData, setSalesData] = useState<SalesReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchDailySales();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  const fetchDailySales = async () => {
    setLoading(true);
    try {
      const response = await apiConfig.report.getSalesReport('daily', selectedDate);
      if (response?.success) {
        setSalesData(normalizeReport(response.data, selectedDate));
      } else {
        setSalesData(normalizeReport(null, selectedDate));
      }
    } catch (error) {
      console.error('Error fetching daily sales:', error);
      setSalesData(normalizeReport(null, selectedDate));
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
    }).format(Number(amount || 0));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">ยอดขายรายวัน</h1>
          <p className="text-gray-600 mt-1">ดูยอดขายในแต่ละวัน</p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gray-400" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">จำนวนออเดอร์</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {Number(salesData?.totalOrders ?? 0)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">ยอดขายรวม</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(Number(salesData?.totalRevenue ?? 0))}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">กำไรโดยประมาณ</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(Number(salesData?.totalProfit ?? 0))}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Top Selling Items */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">สินค้าขายดี</h3>
              <p className="text-sm text-gray-500">วันที่ {formatDate(selectedDate)}</p>
            </div>
            <div className="p-6">
              {salesData && salesData.topSellingItems && salesData.topSellingItems.length > 0 ? (
                <div className="space-y-4">
                  {salesData.topSellingItems.map((item, index) => (
                    <div
                      key={`${item.name}-${index}`}
                      className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0"
                    >
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                          <span className="text-sm font-bold text-blue-600">{index + 1}</span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{item.name}</p>
                          <p className="text-sm text-gray-500">ขายได้ {Number(item.quantity ?? 0)} รายการ</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">{formatCurrency(Number(item.revenue ?? 0))}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">ไม่มีข้อมูลการขายในวันนี้</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DailySalesPage;
