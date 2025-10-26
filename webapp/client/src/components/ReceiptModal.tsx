'use client';

import React from 'react';
import { X, Download, Printer } from 'lucide-react';
import html2canvas from 'html2canvas';

type ReceiptItem = {
  id: string;
  menuItemId?: string;
  menuItemName?: string;
  name?: string;
  quantity: number;
  price?: number;
  subtotal: number;
};

type ReceiptOrder = {
  orderNumber?: string;
  createdAt?: string;
  items: ReceiptItem[];
  subtotal: number;
  discount: number;
  total: number;
  status?: string;
};

interface ReceiptModalProps {
  order: ReceiptOrder;
  onClose: () => void;
}

const ReceiptModal: React.FC<ReceiptModalProps> = ({ order, onClose }) => {
  const receiptRef = React.useRef<HTMLDivElement>(null);

  // 📥 บันทึกใบเสร็จเป็น PNG
  const handleSaveImage = async () => {
    if (!receiptRef.current) return;
    const canvas = await html2canvas(receiptRef.current, {
      backgroundColor: '#ffffff',
      scale: 2,
    });
    const link = document.createElement('a');
    link.download = `receipt-${order.orderNumber ?? 'no-number'}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  // 🖨️ พิมพ์เฉพาะใบเสร็จ
  const handlePrint = () => {
    if (!receiptRef.current) return;
    const html = receiptRef.current.innerHTML;
    const win = window.open('', 'PRINT', 'height=650,width=480');
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>Receipt ${order.orderNumber ?? ''}</title>
          <style>
            * { box-sizing: border-box; font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial; }
            .receipt { width: 360px; margin: 0 auto; padding: 16px; }
            @page { size: auto; margin: 10mm; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 6px 0; }
            thead tr { border-bottom: 1px solid #e5e7eb; }
            tfoot tr { border-top: 1px solid #e5e7eb; }
          </style>
        </head>
        <body>
          <div class="receipt">${html}</div>
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
    win.close();
  };

  const formatDate = (iso?: string) => {
    const date = iso ? new Date(iso) : new Date();
    return date.toLocaleString('th-TH', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 print:hidden">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-800">ใบเสร็จรับเงิน</h3>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Receipt Content */}
          <div ref={receiptRef} className="bg-white p-6 border border-gray-200 rounded-lg">
            {/* Store Header */}
            <div className="text-center mb-6">
              <h2 className="text-lg font-bold text-gray-800">ร้านชา-มา-รถ-ไฟ</h2>
              <p className="text-sm text-gray-600">@ ตลาดอมรพันธ์ แยกเกษตร</p>
              <p className="text-sm text-gray-600">โทร: 082-056-6654 หรือ 090-602-0787</p>
            </div>

            {/* Order Info */}
            <div className="mb-4 pb-4 border-b border-gray-200">
              <div className="flex justify-between text-sm">
                <span>เลขที่ใบเสร็จ:</span>
                <span className="font-medium">{order.orderNumber ?? '-'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>วันที่:</span>
                <span>{formatDate(order.createdAt)}</span>
              </div>
            </div>

            {/* Items */}
            <div className="mb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2">รายการ</th>
                    <th className="text-center py-2">จำนวน</th>
                    <th className="text-right py-2">ราคา</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item.id} className="border-b border-gray-50">
                      <td className="py-1">{item.menuItemName ?? item.name ?? ''}</td>
                      <td className="text-center py-1">{item.quantity}</td>
                      <td className="text-right py-1">฿{item.subtotal.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary */}
            <div className="pt-4 border-t border-gray-200">
              <div className="flex justify-between text-sm mb-1">
                <span>ยอดรวม:</span>
                <span>฿{order.subtotal.toFixed(2)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-sm text-green-600 mb-1">
                  <span>ส่วนลด:</span>
                  <span>-฿{order.discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-200">
                <span>ยอดสุทธิ:</span>
                <span>฿{order.total.toFixed(2)}</span>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center mt-6 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">ขอบคุณที่ใช้บริการ</p>
              <p className="text-xs text-gray-500 mt-2">ใบเสร็จนี้สร้างโดยระบบ POS อัตโนมัติ</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={handleSaveImage}
              className="flex-1 bg-primary-600 text-white rounded-lg py-2 font-medium hover:bg-primary-700"
            >
              <div className="flex items-center justify-center gap-2">
                <Download className="w-5 h-5" />
                บันทึกรูปภาพ
              </div>
            </button>
            <button
              onClick={handlePrint}
              className="flex-1 bg-gray-100 text-gray-800 rounded-lg py-2 font-medium hover:bg-gray-200"
            >
              <div className="flex items-center justify-center gap-2">
                <Printer className="w-5 h-5" />
                พิมพ์
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceiptModal;
