import React from 'react';
import { CartItem } from '../stores/cartStore';
import { Promotion } from '../types';

type Props = {
  items: CartItem[];
  subtotal: number;
  discount: number;
  total: number;
  promotion?: Promotion;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

const PaymentConfirmation: React.FC<Props> = ({
  items,
  subtotal,
  discount,
  total,
  promotion,
  loading = false,
  onConfirm,
  onCancel,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-lg">
        <div className="px-5 py-4 border-b">
          <h3 className="text-lg font-semibold">ยืนยันการชำระเงิน</h3>
        </div>

        <div className="px-5 py-4 space-y-3 max-h-[60vh] overflow-y-auto">
          <div className="space-y-2">
            {items.map((it) => (
              <div key={it.menuItemId} className="flex justify-between text-sm">
                <div className="truncate">
                  {it.menuItem?.name ?? `เมนู #${it.menuItemId}`} × {it.quantity}
                </div>
                <div>฿{(Number(it.price) * Number(it.quantity)).toFixed(2)}</div>
              </div>
            ))}
          </div>

          <hr />

          <div className="flex justify-between text-sm">
            <span>ยอดรวม</span>
            <span>฿{subtotal.toFixed(2)}</span>
          </div>

          {promotion && discount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>
                ส่วนลด {promotion.name}
                {promotion.discountType === 'percentage'
                  ? ` (${promotion.discountValue}%)`
                  : ''}
              </span>
              <span>-฿{discount.toFixed(2)}</span>
            </div>
          )}

          <div className="flex justify-between font-semibold text-base">
            <span>ยอดสุทธิ</span>
            <span className="text-primary-600">฿{total.toFixed(2)}</span>
          </div>
        </div>

        <div className="px-5 py-4 border-t flex gap-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 border rounded-lg py-2 hover:bg-gray-50 disabled:opacity-60"
          >
            ยกเลิก
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 rounded-lg py-2 bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-60"
          >
            {loading ? 'กำลังชำระเงิน…' : 'ยืนยันชำระเงิน'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentConfirmation;
