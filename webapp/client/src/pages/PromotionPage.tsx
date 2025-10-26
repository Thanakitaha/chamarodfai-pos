import React from 'react';
import { Tag, Calendar, Percent, DollarSign } from 'lucide-react';

const PromotionPage: React.FC = () => {
  // Sample promotions data
  const promotions = [
    {
      id: '1',
      name: 'ลดราคา 10% เมื่อซื้อครบ 200 บาท',
      description: 'รับส่วนลด 10% เมื่อซื้อสินค้าครบ 200 บาท ขึ้นไป',
      discountType: 'percentage' as const,
      discountValue: 10,
      minOrderAmount: 200,
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      active: true
    },
    {
      id: '2',
      name: 'ลดทันที 20 บาท',
      description: 'ลดทันที 20 บาท สำหรับทุกออเดอร์ที่มีมูลค่าตั้งแต่ 100 บาท',
      discountType: 'fixed' as const,
      discountValue: 20,
      minOrderAmount: 100,
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      active: true
    }
  ];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">จัดการโปรโมชั่น</h1>
      </div>

      <div className="grid gap-6">
        {promotions.map(promotion => (
          <div key={promotion.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Tag className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">{promotion.name}</h3>
                  <p className="text-gray-600 mt-1">{promotion.description}</p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                promotion.active 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {promotion.active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {/* Discount Info */}
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                {promotion.discountType === 'percentage' ? (
                  <Percent className="w-5 h-5 text-blue-600" />
                ) : (
                  <DollarSign className="w-5 h-5 text-blue-600" />
                )}
                <div>
                  <p className="text-sm text-gray-600">ส่วนลด</p>
                  <p className="font-semibold text-gray-800">
                    {promotion.discountType === 'percentage' 
                      ? `${promotion.discountValue}%` 
                      : `฿${promotion.discountValue}`
                    }
                  </p>
                </div>
              </div>

              {/* Minimum Order */}
              {promotion.minOrderAmount && (
                <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
                  <DollarSign className="w-5 h-5 text-yellow-600" />
                  <div>
                    <p className="text-sm text-gray-600">ขั้นต่ำ</p>
                    <p className="font-semibold text-gray-800">฿{promotion.minOrderAmount}</p>
                  </div>
                </div>
              )}

              {/* Date Range */}
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                <Calendar className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">ระยะเวลา</p>
                  <p className="font-semibold text-gray-800 text-sm">
                    {formatDate(promotion.startDate)} - {formatDate(promotion.endDate)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {promotions.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <Tag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-800 mb-2">ไม่มีโปรโมชั่น</h3>
          <p className="text-gray-600">ยังไม่มีโปรโมชั่นในระบบ</p>
        </div>
      )}
    </div>
  );
};

export default PromotionPage;
