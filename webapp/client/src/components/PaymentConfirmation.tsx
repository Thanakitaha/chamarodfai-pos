import React from 'react';
import { X, Check, AlertCircle } from 'lucide-react';
import { OrderItem, Promotion } from '../types';

interface PaymentConfirmationProps {
  items: OrderItem[];
  subtotal: number;
  discount: number;
  total: number;
  promotion?: Promotion;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}

const PaymentConfirmation: React.FC<PaymentConfirmationProps> = ({
  items,
  subtotal,
  discount,
  total,
  promotion,
  onConfirm,
  onCancel,
  loading,
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-6 h-6 text-orange-600" />
              <h3 className="text-xl font-bold text-gray-800">ยืนยันการชำระเงิน</h3>
            </div>
            <button
              onClick={onCancel}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Order Items */}
          <div className="mb-6">
            <h4 className="font-medium text-gray-800 mb-3">รายการสินค้า</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {items.map(item => (
                <div key={item.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-800">{item.menuItem?.name}</p>
                    <p className="text-sm text-gray-600">฿{item.price.toFixed(2)} x {item.quantity}</p>
                  </div>
                  <p className="font-medium text-gray-800">฿{item.subtotal.toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Promotion */}
          {promotion && (
            <div className="mb-6 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium text-green-800">{promotion.name}</span>
              </div>
              <p className="text-sm text-green-600 mt-1">{promotion.description}</p>
            </div>
          )}

          {/* Payment Summary */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">ยอดรวม</span>
                <span className="font-medium">฿{subtotal.toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>ส่วนลด</span>
                  <span>-฿{discount.toFixed(2)}</span>
                </div>
              )}
              <hr className="my-2" />
              <div className="flex justify-between text-lg font-bold">
                <span>ยอดสุทธิ</span>
                <span className="text-primary-600">฿{total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              disabled={loading}
              className="flex-1 btn-secondary"
            >
              ยกเลิก
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 btn-success flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Check className="w-5 h-5" />
              )}
              {loading ? 'กำลังดำเนินการ...' : 'ยืนยันชำระเงิน'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentConfirmation;
