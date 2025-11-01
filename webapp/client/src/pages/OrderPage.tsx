// src/pages/OrderPage.tsx
import React, { useState, useEffect } from 'react';
import { Plus, Minus, Trash2, ShoppingCart, Receipt } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { orderAPI } from '../services/api';
import { useCartStore } from '../stores/cartStore';
import apiConfig from '../services/api-config';
import { MenuItem, Promotion } from '../types';
import PaymentConfirmation from '../components/PaymentConfirmation';
import ReceiptModal from '../components/ReceiptModal';

// ---- helpers: number/string safe casting ----
const toNum = (v: any, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

// ---- normalize order payload from API (รองรับ {order:{...}} หรือ {...}, และ snake/camel) ----
const normalizeOrderForUI = (raw: any) => {
  const o = raw?.order ?? raw ?? {};
  const items = Array.isArray(o.items) ? o.items : [];

  return {
    orderNumber: o.orderNumber ?? o.order_number ?? '',
    createdAt: o.createdAt ?? o.created_at ?? undefined,
    items, // ปล่อยดิบไว้ให้ ReceiptModal จัดการ layer สุดท้ายอีกชั้น (เราแค่กันไม่ให้ undefined)
    subtotal: toNum(o.subtotal, 0),
    discount: toNum(o.discount, 0),
    total: toNum(o.total, 0),
    status: o.status ?? 'paid',
  };
};

const OrderPage: React.FC = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ทั้งหมด');
  const [showPaymentConfirmation, setShowPaymentConfirmation] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    items,
    subtotal,
    discount,
    total,
    selectedPromotion,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    applyPromotion,
  } = useCartStore();

  useEffect(() => {
    fetchMenuItems();
    fetchPromotions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchMenuItems = async () => {
    try {
      const response = await apiConfig.menu.getAll();
      if (response?.success && Array.isArray(response.data)) {
        setMenuItems(response.data);
      }
    } catch {
      toast.error('ไม่สามารถโหลดเมนูได้');
    }
  };

  const fetchPromotions = async () => {
    try {
      const response = await apiConfig.promotion.getAll();
      if (response?.success && Array.isArray(response.data)) {
        setPromotions(response.data.filter((p: Promotion) => p.active));
      }
    } catch {
      toast.error('ไม่สามารถโหลดโปรโมชั่นได้');
    }
  };

  const categories = [
    'ทั้งหมด',
    ...Array.from(new Set(menuItems.map((item) => item.category))),
  ];

  const filteredMenuItems =
    selectedCategory === 'ทั้งหมด'
      ? menuItems.filter((item) => item.available)
      : menuItems.filter(
          (item) => item.category === selectedCategory && item.available
        );

  const handlePayment = () => {
    if (items.length === 0) {
      toast.error('กรุณาเลือกสินค้าก่อนชำระเงิน');
      return;
    }
    setShowPaymentConfirmation(true);
  };

  const handleConfirmPayment = async () => {
    try {
      setShowPaymentConfirmation(false);
      setIsSubmitting(true);
      setLoading(true);

      const { items: cartItems, selectedPromotion: promo } =
        useCartStore.getState();

      if (!Array.isArray(cartItems) || cartItems.length === 0) {
        toast.error('ไม่มีรายการสินค้า');
        return;
      }

      const payload = {
        items: cartItems.map((it) => ({
          menuItemId: Number(it.menuItemId),
          price: Number(it.price),
          quantity: Number(it.quantity),
        })),
        promotionId: promo ? Number(promo.id) : null,
        taxAmount: 0,
        serviceCharge: 0,
        status: 'paid' as const,
      };

      const res = await orderAPI.create(payload);
      if (!res?.success) {
        throw new Error(res?.error || 'สร้างออเดอร์ไม่สำเร็จ');
      }

      // 🔒 normalize ก่อนเซ็ต state กันรูปทรงแปลก ๆ
      const normalized = normalizeOrderForUI(res.data);
      if (!Array.isArray(normalized.items)) normalized.items = [];

      setCompletedOrder(normalized);
      setShowReceipt(true);

      toast.success('ชำระเงินสำเร็จ');
      useCartStore.getState().clearCart();
    } catch (err: any) {
      toast.error(err?.message || 'เกิดข้อผิดพลาด');
    } finally {
      setIsSubmitting(false);
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 h-full">
      {/* Menu Section */}
      <div className="flex-1 order-2 lg:order-1">
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6">
            เมนูเครื่องดื่ม
          </h2>

          {/* Category Filter */}
          <div className="flex gap-2 mb-4 sm:mb-6 overflow-x-auto pb-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 sm:px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors text-sm sm:text-base ${
                  selectedCategory === category
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Menu Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3 sm:gap-4">
            {filteredMenuItems.map((item) => (
              <div
                key={item.id}
                className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => addItem(item)}
              >
                <div className="aspect-square bg-gray-100 rounded-lg mb-2 sm:mb-3 flex items-center justify-center">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <div className="text-gray-400 text-2xl sm:text-4xl">🥤</div>
                  )}
                </div>
                <h3 className="font-semibold text-gray-800 mb-1 text-sm sm:text-base line-clamp-1">
                  {item.name}
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 mb-2 line-clamp-2">
                  {item.description}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-sm sm:text-lg font-bold text-primary-600">
                    ฿{item.price.toFixed(2)}
                  </span>
                  <button
                    className="bg-primary-600 text-white p-1.5 sm:p-2 rounded-lg hover:bg-primary-700 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      addItem(item);
                    }}
                  >
                    <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cart Section */}
      <div className="w-full lg:w-80 xl:w-96 order-1 lg:order-2">
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 lg:sticky lg:top-6">
          <div className="flex items-center gap-2 mb-4 sm:mb-6">
            <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6 text-primary-600" />
            <h3 className="text-lg sm:text-xl font-bold text-gray-800">
              รายการสั่งซื้อ
            </h3>
          </div>

          {items.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <div className="text-gray-400 text-4xl sm:text-6xl mb-3 sm:mb-4">
                🛒
              </div>
              <p className="text-gray-500 text-sm sm:text-base">
                ไม่มีสินค้าในตะกร้า
              </p>
            </div>
          ) : (
            <>
              {/* Cart Items */}
              <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6 max-h-48 sm:max-h-64 lg:max-h-80 overflow-y-auto">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-800 text-sm sm:text-base line-clamp-1">
                        {item.menuItem?.name ?? `เมนู #${item.menuItemId}`}
                      </h4>
                      <p className="text-xs sm:text-sm text-gray-600">
                        ฿{Number(item.price).toFixed(2)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2">
                      <button
                        onClick={() =>
                          updateQuantity(
                            item.menuItemId,
                            Number(item.quantity) - 1
                          )
                        }
                        className="p-1 text-gray-600 hover:text-gray-800"
                      >
                        <Minus className="w-3 h-3 sm:w-4 sm:h-4" />
                      </button>
                      <span className="font-medium w-6 sm:w-8 text-center text-sm sm:text-base">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() =>
                          updateQuantity(
                            item.menuItemId,
                            Number(item.quantity) + 1
                          )
                        }
                        className="p-1 text-gray-600 hover:text-gray-800"
                      >
                        <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                      </button>
                      <button
                        onClick={() => removeItem(item.menuItemId)}
                        className="p-1 text-red-600 hover:text-red-800 ml-1 sm:ml-2"
                      >
                        <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Promotion Selection */}
              <div className="mb-4 sm:mb-6">
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                  โปรโมชั่น
                </label>
                <select
                  value={selectedPromotion ? String(selectedPromotion.id) : ''}
                  onChange={(e) => {
                    const promo = promotions.find(
                      (p) => String(p.id) === e.target.value
                    );
                    applyPromotion(promo);
                  }}
                  className="w-full p-2 sm:p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm sm:text-base"
                >
                  <option value="">ไม่ใช้โปรโมชั่น</option>
                  {promotions.map((promo) => (
                    <option key={String(promo.id)} value={String(promo.id)}>
                      {promo.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Order Summary */}
              <div className="space-y-1.5 sm:space-y-2 mb-4 sm:mb-6 p-3 sm:p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between text-sm sm:text-base">
                  <span>ยอดรวม</span>
                  <span>฿{subtotal.toFixed(2)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-green-600 text-sm sm:text-base">
                    <span>ส่วนลด</span>
                    <span>-฿{discount.toFixed(2)}</span>
                  </div>
                )}
                <hr className="my-1.5 sm:my-2" />
                <div className="flex justify-between font-bold text-base sm:text-lg">
                  <span>ยอดสุทธิ</span>
                  <span className="text-primary-600">฿{total.toFixed(2)}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 sm:space-y-3">
                <button
                  onClick={handlePayment}
                  disabled={isSubmitting}
                  className="w-full btn-primary flex items-center justify-center gap-2 py-2.5 sm:py-3 text-sm sm:text-base"
                >
                  <Receipt className="w-4 h-4 sm:w-5 sm:h-5" />
                  ชำระเงิน
                </button>
                <button
                  onClick={clearCart}
                  disabled={isSubmitting}
                  className="w-full btn-secondary py-2 sm:py-2.5 text-sm sm:text-base"
                >
                  ล้างรายการ
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Payment Confirmation Modal */}
      {showPaymentConfirmation && (
        <PaymentConfirmation
          items={items}
          subtotal={subtotal}
          discount={discount}
          total={total}
          promotion={selectedPromotion}
          onConfirm={handleConfirmPayment}
          onCancel={() => setShowPaymentConfirmation(false)}
          loading={loading || isSubmitting}
        />
      )}

      {/* Receipt Modal */}
      {showReceipt && completedOrder && (
        <ReceiptModal
          order={completedOrder} // normalized object
          onClose={() => setShowReceipt(false)}
        />
      )}
    </div>
  );
};

export default OrderPage;
