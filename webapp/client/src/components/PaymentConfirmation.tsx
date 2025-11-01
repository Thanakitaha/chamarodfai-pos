// src/components/PaymentConfirmation.tsx
import React from 'react';

// ===== Local types (กันปัญหา cache ของ types.ts) =====
type LocalTopping = { id: string; name: string; price: number };
type LocalCartItem = {
  menuItemId: number;
  price: number;
  quantity: number;
  menuItem?: { name?: string | null };
  variantKey?: string;
  sweetness?: 'extra' | 'normal' | 'less' | 'none';
  toppings?: LocalTopping[];
};

type Props = {
  items: LocalCartItem[];
  subtotal: number;
  discount: number;
  total: number;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
};

const PaymentConfirmation: React.FC<Props> = ({
  items, subtotal, discount, total, onConfirm, onCancel,
}) => {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-4 sm:p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-3">ยืนยันการชำระเงิน</h3>

        <div className="max-h-56 overflow-auto border rounded-lg mb-3 p-2">
          {items.map((it) => (
            <div
              key={`${it.menuItemId}-${it.variantKey ?? 'default'}`}
              className="flex justify-between text-sm py-1"
            >
              <div>
                <div className="font-medium">{it.menuItem?.name}</div>
                {(it.sweetness || (it.toppings && it.toppings.length)) && (
                  <div className="text-xs text-gray-500">
                    {it.sweetness ? `• ${it.sweetness}` : ''}
                    {it.toppings && it.toppings.length > 0
                      ? ` • ${it.toppings.map((t: LocalTopping) => t.name).join(', ')}`
                      : ''}
                  </div>
                )}
              </div>
              <div>฿{(Number(it.price) * Number(it.quantity)).toFixed(2)}</div>
            </div>
          ))}
        </div>

        <div className="space-y-1 text-sm">
          <div className="flex justify-between"><span>ยอดรวม</span><span>฿{Number(subtotal).toFixed(2)}</span></div>
          <div className="flex justify-between text-green-600"><span>ส่วนลด</span><span>-฿{Number(discount).toFixed(2)}</span></div>
          <div className="flex justify-between font-semibold"><span>สุทธิ</span><span>฿{Number(total).toFixed(2)}</span></div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button className="px-4 py-2 rounded-lg border" onClick={onCancel}>ยกเลิก</button>
          <button className="px-4 py-2 rounded-lg bg-black text-white" onClick={onConfirm}>ยืนยัน</button>
        </div>
      </div>
    </div>
  );
};

export default PaymentConfirmation;
