// src/pages/OrderPage.tsx
import React, { useState, useEffect } from 'react';
import { Plus, Minus, Trash2, ShoppingCart, Receipt } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api, { orderAPI, promotionAPI } from '../services/api'; // ใช้ api.ts เดิมของคุณ
import { useCartStore } from '../stores/cartStore';
import { MenuItem, Promotion, Topping, CartItem } from '../types';
import PaymentConfirmation from '../components/PaymentConfirmation';
import ReceiptModal from '../components/ReceiptModal';

const toNum = (v: any, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

const toAbsoluteUrl = (url?: string | null): string => {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  const origin = window.location.origin;
  return `${origin}${url.startsWith('/') ? url : `/${url}`}`;
};

const SWEETNESS = [
  { key: 'extra', label: 'เพิ่มหวาน' },
  { key: 'normal', label: 'หวานปกติ' },
  { key: 'less', label: 'หวานน้อย' },
  { key: 'none', label: 'ไม่หวาน' },
] as const;

type SweetnessKey = typeof SWEETNESS[number]['key'];

const TOPPINGS: ReadonlyArray<Topping> = [
  { id: 'tp_pearl', name: 'ไข่มุก', price: 5 },
  { id: 'tp_pudding', name: 'พุดดิ้ง', price: 7 },
  { id: 'tp_grass', name: 'เฉาก๊วย', price: 5 },
  { id: 'tp_cheese', name: 'ชีสโฟม', price: 10 },
] as const;

const normalizeOrderForUI = (o: any) => {
  const items = Array.isArray(o.items)
    ? o.items.map((it: any) => ({
        id: Number(it.id ?? it.order_item_id ?? 0),
        orderId: Number(it.orderId ?? it.order_id ?? 0),
        menuItemId: Number(it.menuItemId ?? it.menu_item_id ?? 0),
        name: it.name ?? it.menu_item_name ?? '',
        quantity: Number(it.quantity ?? 1),
        price: Number(it.price ?? 0),
        subtotal: Number(it.subtotal ?? (Number(it.price ?? 0) * Number(it.quantity ?? 1))),
        note: typeof it.note === 'string' ? it.note : it.note ? JSON.stringify(it.note) : null,
      }))
    : [];

  return {
    id: Number(o.id ?? o.order_id ?? 0),
    orderNumber: o.orderNumber ?? o.order_number ?? '',
    promotionId: o.promotionId ?? Number(o.promotion_id ?? 0) || null,
    items,
    subtotal: Number(o.subtotal ?? 0),
    discount: Number(o.discount ?? 0),
    total: Number(o.total ?? 0),
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

  // โมดัลปรับแต่ง
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [selectedSweetness, setSelectedSweetness] = useState<SweetnessKey>('normal');
  const [selectedToppings, setSelectedToppings] = useState<Topping[]>([]);
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

  const openCustomize = (item: MenuItem) => {
    setCustomizingItem(item);
    setSelectedSweetness('normal');
    setSelectedToppings([]);
  };

  const toggleTopping = (tp: Topping) => {
    setSelectedToppings((prev) => {
      const exists = prev.find((t) => t.id === tp.id);
      if (exists) return prev.filter((t) => t.id !== tp.id);
      return [...prev, tp];
    });
  };

  const confirmCustomize = () => {
    if (!customizingItem) return;
    const toppingsTotal = selectedToppings.reduce<number>(
      (s: number, t: Topping) => s + Number(t.price || 0),
      0
    );
    const customPrice = Number(customizingItem.price) + toppingsTotal;
    const variantKey = `${customizingItem.id}|${selectedSweetness}|${selectedToppings
      .map((t: Topping) => t.id)
      .sort()
      .join('+')}`;

    addItem({
      ...customizingItem,
      customPrice,
      sweetness: selectedSweetness,
      toppings: [...selectedToppings],
      variantKey,
    } as any);

    setCustomizingItem(null);
    toast.success('เพิ่มลงตะกร้าแล้ว');
  };

  useEffect(() => {
    fetchMenuItems();
    fetchPromotions();
  }, []);

  const fetchMenuItems = async () => {
    try {
      const res = await api.get('/menu');
      const data = res?.data?.data;
      if (res?.data?.success && Array.isArray(data)) {
        setMenuItems(data as MenuItem[]);
      } else {
        setMenuItems([]);
      }
    } catch (error: any) {
      console.error(error);
      setMenuItems([]);
    }
  };

  const fetchPromotions = async () => {
    try {
      const response = await promotionAPI.list(true);
      if (response?.success && Array.isArray(response.data)) {
        setPromotions(response.data);
      } else {
        setPromotions([]);
      }
    } catch (error: any) {
      console.error(error);
      setPromotions([]);
    }
  };

  const categories = ['ทั้งหมด', ...Array.from(new Set(menuItems.map((i) => i.category ?? 'อื่น ๆ')))];

  const filteredMenu = selectedCategory === 'ทั้งหมด'
    ? menuItems
    : menuItems.filter((i) => (i.category ?? 'อื่น ๆ') === selectedCategory);

  const handlePay = () => {
    if (!items.length) {
      toast.error('กรุณาเลือกสินค้า');
      return;
    }
    setShowPaymentConfirmation(true);
  };

  const handleConfirmPayment = async () => {
    try {
      setShowPaymentConfirmation(false);
      setIsSubmitting(true);

      const { items: cartItems, selectedPromotion: promo } = useCartStore.getState();

      if (!Array.isArray(cartItems) || cartItems.length === 0) {
        toast.error('ไม่มีรายการสินค้า');
        return;
      }

      const payload = {
        items: cartItems.map((it: CartItem) => ({
          menuItemId: Number(it.menuItemId),
          price: Number(it.price),
          quantity: Number(it.quantity),
          // แนบข้อมูล sweetness/toppings ลง note แบบ JSON string
          note: JSON.stringify({
            sweetness: it.sweetness ?? 'normal',
            toppings: (it.toppings ?? []).map((t: Topping) => ({
              id: t.id,
              name: t.name,
              price: t.price,
            })),
            toppingsTotal: (it.toppings ?? []).reduce<number>(
              (s: number, t: Topping) => s + Number(t.price || 0),
              0
            ),
          }),
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

      const normalized = normalizeOrderForUI(res.data);
      if (!Array.isArray(normalized.items)) normalized.items = [];

      setCompletedOrder(normalized);
      clearCart();
      setShowReceipt(true);
      toast.success('ชำระเงินสำเร็จ');
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'เกิดข้อผิดพลาด');
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeFromCart = (menuItemId: number, variantKey?: string) => {
    removeItem(menuItemId, variantKey);
  };

  const updateItemQty = (menuItemId: number, qty: number, variantKey?: string) => {
    if (qty <= 0) {
      removeItem(menuItemId, variantKey);
    } else {
      updateQuantity(menuItemId, qty, variantKey);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* เมนูฝั่งซ้าย */}
        <div className="md:col-span-2">
          <div className="mb-4 flex gap-2 flex-wrap">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-full border text-sm ${
                  selectedCategory === cat ? 'border-black' : 'border-gray-300'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {filteredMenu.map((item) => {
              const imgSrc = toAbsoluteUrl(item.image);
              return (
                <div
                  key={item.id}
                  className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => openCustomize(item)}
                >
                  <div className="aspect-square bg-gray-100 rounded-lg mb-2 sm:mb-3 flex items-center justify-center">
                    {imgSrc ? (
                      <img
                        src={imgSrc}
                        alt={item.name}
                        className="w-full h-full object-cover rounded-lg"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <span className="text-gray-400 text-sm">No image</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-sm text-gray-500">฿{toNum(item.price).toFixed(2)}</div>
                    </div>
                    <button className="p-2 rounded-full hover:bg-gray-100">
                      <Plus size={18} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ตะกร้าฝั่งขวา */}
        <div className="md:col-span-1">
          <div className="bg-white border border-gray-200 rounded-lg p-4 sticky top-4">
            <div className="flex items-center gap-2 mb-3">
              <ShoppingCart size={18} />
              <div className="font-semibold">ตะกร้าสินค้า</div>
            </div>

            {items.length === 0 ? (
              <div className="text-sm text-gray-500">ยังไม่มีสินค้าในตะกร้า</div>
            ) : (
              <div className="space-y-3">
                {items.map((it) => (
                  <div key={`${it.menuItemId}-${it.variantKey ?? 'default'}`} className="flex items-start justify-between">
                    <div>
                      <div className="font-medium">{it.menuItem?.name}</div>
                      {(it.sweetness || (it.toppings && it.toppings.length)) && (
                        <div className="text-xs text-gray-500">
                          {it.sweetness && `• ${SWEETNESS.find(s => s.key === it.sweetness)?.label ?? ''}`}{' '}
                          {it.toppings && it.toppings.length > 0 && `• ${it.toppings.map((t) => t.name).join(', ')}`}
                        </div>
                      )}
                      <div className="text-xs text-gray-400">
                        ฿{toNum(it.price).toFixed(2)} x {toNum(it.quantity)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        className="p-1 rounded hover:bg-gray-100"
                        onClick={() => updateItemQty(it.menuItemId, it.quantity - 1, it.variantKey)}
                      >
                        <Minus size={16} />
                      </button>
                      <button
                        className="p-1 rounded hover:bg-gray-100"
                        onClick={() => updateItemQty(it.menuItemId, it.quantity + 1, it.variantKey)}
                      >
                        <Plus size={16} />
                      </button>
                      <button
                        className="p-1 rounded hover:bg-gray-100"
                        onClick={() => removeFromCart(it.menuItemId, it.variantKey)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t my-3" />

            {/* โปรโมชั่น */}
            <div className="mb-3">
              <div className="text-sm font-medium mb-1">โปรโมชั่น</div>
              <select
                className="w-full border rounded px-2 py-1.5 text-sm"
                value={selectedPromotion ? String(selectedPromotion.id) : ''} // ไม่ส่ง null
                onChange={(e) => {
                  const id = e.target.value;
                  const p = promotions.find((x) => String(x.id) === id);
                  applyPromotion(p);
                }}
              >
                <option value="">-- ไม่ใช้โปรโมชั่น --</option>
                {promotions.map((p) => (
                  <option key={p.id} value={String(p.id)}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span>ยอดรวม</span><span>฿{toNum(subtotal).toFixed(2)}</span></div>
              <div className="flex justify-between text-green-600"><span>ส่วนลด</span><span>-฿{toNum(discount).toFixed(2)}</span></div>
              <div className="flex justify-between font-semibold"><span>สุทธิ</span><span>฿{toNum(total).toFixed(2)}</span></div>
            </div>

            <button
              className="w-full mt-4 bg-black text-white py-2.5 rounded-lg disabled:opacity-50"
              onClick={handlePay}
              disabled={isSubmitting || items.length === 0}
            >
              <Receipt className="inline-block mr-2" size={16} />
              ชำระเงิน
            </button>
          </div>
        </div>
      </div>

      {showPaymentConfirmation && (
        <PaymentConfirmation
          items={items}
          subtotal={subtotal}
          discount={discount}
          total={total}
          onConfirm={handleConfirmPayment}
          onCancel={() => setShowPaymentConfirmation(false)}
        />
      )}

      {/* โมดัลปรับแต่ง */}
      {customizingItem && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-4 sm:p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold">เลือกปรับแต่ง: {customizingItem.name}</h3>
              <button className="text-gray-500 hover:text-black" onClick={() => setCustomizingItem(null)}>✕</button>
            </div>

            <div className="mb-4">
              <div className="font-medium mb-2">ระดับความหวาน</div>
              <div className="grid grid-cols-2 gap-2">
                {SWEETNESS.map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => setSelectedSweetness(opt.key)}
                    className={
                      'border rounded-lg px-3 py-2 text-sm ' +
                      (selectedSweetness === opt.key ? 'border-black' : 'border-gray-300')
                    }
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <div className="font-medium mb-2">ท็อปปิ้ง (คิดเพิ่มตามราคา)</div>
              <div className="grid grid-cols-2 gap-2">
                {TOPPINGS.map((tp: Topping) => {
                  const active = !!selectedToppings.find(t => t.id === tp.id);
                  return (
                    <button
                      key={tp.id}
                      onClick={() => toggleTopping(tp)}
                      className={
                        'border rounded-lg px-3 py-2 text-sm flex items-center justify-between ' +
                        (active ? 'border-black' : 'border-gray-300')
                      }
                    >
                      <span>{tp.name}</span>
                      <span className="text-xs opacity-70">+{tp.price}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                ราคารวม:{' '}
                {(
                  Number(customizingItem.price) +
                  selectedToppings.reduce<number>(
                    (s: number, t: Topping) => s + Number(t.price || 0),
                    0
                  )
                ).toFixed(2)}
              </div>
              <div className="space-x-2">
                <button className="px-4 py-2 rounded-lg border" onClick={() => setCustomizingItem(null)}>ยกเลิก</button>
                <button className="px-4 py-2 rounded-lg bg-black text-white" onClick={confirmCustomize}>เพิ่มลงตะกร้า</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ใบเสร็จ */}
      {showReceipt && completedOrder && (
        <ReceiptModal
          order={completedOrder}
          onClose={() => setShowReceipt(false)}
        />
      )}
    </div>
  );
};

export default OrderPage;
