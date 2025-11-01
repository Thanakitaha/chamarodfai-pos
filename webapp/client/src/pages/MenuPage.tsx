// src/pages/MenuPage.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Plus, Edit, Trash2, Coffee, Image as ImageIcon, X } from 'lucide-react';
import apiConfig from '../services/api-config';
import type { MenuItem } from '../types';

type FormState = {
  name: string;
  price: number;
  cost: number;
  category: string;    // อนุโลมเป็น string เพื่อใช้ชื่อ/ตัวเลขได้
  description: string;
  available: boolean;
  image?: string;      // URL จริง (undefined แทน null)
};

const emptyForm: FormState = {
  name: '',
  price: 0,
  cost: 0,
  category: '',
  description: '',
  available: true,
  image: undefined,
};

// ---- helpers ----
function extractErr(resp: unknown, fallback = 'เกิดข้อผิดพลาด'): string {
  const r: any = resp ?? {};
  return r?.message || r?.error || r?.detail || r?.data?.message || r?.data?.error || fallback;
}

// turn relative url to absolute
function toAbsoluteUrl(url: string): string {
  if (!url) return url;
  if (/^https?:\/\//i.test(url)) return url;
  const base = (apiConfig as any).baseURL || '';
  const origin = base.replace(/\/api\/?$/, '');
  return `${origin}${url.startsWith('/') ? url : `/${url}`}`;
}

// แปลงค่าหมวดหมู่ให้เป็นเลข (หรือ null ถ้าไม่ใช่เลข)
function toCategoryId(value: string): number | null {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null; // "Tea" -> null (กัน error bigint)
}

const MenuPage: React.FC = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // สำหรับแสดงพรีวิวเท่านั้น (object URL)
  const [imagePreview, setImagePreview] = useState<string | undefined>(undefined);

  const [formData, setFormData] = useState<FormState>(emptyForm);

  async function fetchMenuItems() {
    try {
      const response = await apiConfig.menu.getAll();
      if (response?.success && response?.data) {
        setMenuItems(response.data as MenuItem[]);
      } else {
        toast.error(extractErr(response, 'ไม่สามารถโหลดเมนูได้'));
      }
    } catch (e) {
      console.error(e);
      toast.error('ไม่สามารถโหลดเมนูได้');
    }
  }
  useEffect(() => { fetchMenuItems(); }, []);

  const categories = useMemo(() => {
    const base = ['เครื่องดื่ม', 'ขนม', 'Topping'];
    const fromItems = Array.from(new Set(menuItems.map((m) => m.category))).filter(Boolean) as string[];
    return Array.from(new Set([...base, ...fromItems]));
  }, [menuItems]);

  function resetForm() {
    setFormData(emptyForm);
    setEditingItem(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(undefined);
    }
  }

  function openCreate() {
    resetForm();
    setShowModal(true);
  }

  function openEdit(item: MenuItem) {
    resetForm();
    setEditingItem(item);
    setFormData({
      name: item.name,
      price: item.price,
      cost: typeof item.cost === 'number' ? item.cost : 0,
      category: item.category || '',
      description: item.description || '',
      available: item.available,
      image: item.image ?? undefined,       // เก็บ URL จริงไว้บันทึกตอนกด Save
    });
    if (item.image) setImagePreview(toAbsoluteUrl(item.image)); // พรีวิวรูปเดิมได้
    setShowModal(true);
  }

  // payload mapping ไปยัง API เดิม
  function toUpdatePayload(f: FormState): Partial<MenuItem> {
    return {
      name: f.name,
      price: f.price,
      cost: f.cost,
      categoryId: toCategoryId(f.category) as any, // ส่งเลข/ null เท่านั้น
      available: f.available as any,
      ...(f.description !== undefined ? { description: f.description } : {}),
      ...(f.image !== undefined ? { image: f.image } : {}),
    } as any;
  }

  function toCreatePayload(f: FormState): Omit<MenuItem, 'id' | 'createdAt' | 'updatedAt'> {
    const payload: any = {
      name: f.name,
      price: f.price,
      cost: f.cost,
      categoryId: toCategoryId(f.category), // ส่งเลข/ null เท่านั้น
      available: f.available,
    };
    if (f.description !== undefined) payload.description = f.description;
    if (f.image !== undefined) payload.image = f.image;
    return payload;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      let resp: any;
      if (editingItem) {
        resp = await apiConfig.menu.update(editingItem.id, toUpdatePayload(formData));
      } else {
        resp = await apiConfig.menu.create(toCreatePayload(formData));
      }
      if (!resp?.success) throw new Error(extractErr(resp, 'บันทึกไม่สำเร็จ'));
      toast.success(editingItem ? 'อัปเดตเมนูสำเร็จ' : 'เพิ่มเมนูสำเร็จ');
      await fetchMenuItems();
      setShowModal(false);
      resetForm();
    } catch (err: any) {
      console.error(err);
      toast.error(`บันทึกล้มเหลว: ${err?.message || 'เกิดข้อผิดพลาด'}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('ต้องการลบเมนูนี้ใช่หรือไม่?')) return;
    try {
      const resp: any = await apiConfig.menu.delete(id);
      if (!resp?.success) throw new Error(extractErr(resp, 'ลบไม่สำเร็จ'));
      toast.success('ลบเมนูสำเร็จ');
      await fetchMenuItems();
    } catch (err: any) {
      console.error(err);
      toast.error(`ไม่สามารถลบเมนูได้: ${err?.message || 'เกิดข้อผิดพลาด'}`);
    }
  }

  // upload image + preview (คง object URL)
  async function uploadImage(file: File) {
    const localUrl = URL.createObjectURL(file);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(localUrl);

    const fd = new FormData();
    fd.append('file', file);
    try {
      setUploading(true);
      const res = await fetch('/api/uploads/menu-image', { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.url) throw new Error(extractErr(data, 'Upload failed'));

      // เก็บ URL จริงไว้ใน formData เพื่อบันทึกลงฐานข้อมูลตอนกด Save
      const absUrl = toAbsoluteUrl(data.url as string);
      setFormData((prev) => ({ ...prev, image: absUrl }));

      toast.success('อัปโหลดรูปสำเร็จ');
    } catch (err: any) {
      console.error(err);
      toast.error(`อัปโหลดล้มเหลว: ${err?.message || 'เกิดข้อผิดพลาด'}`);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="p-3 sm:p-4 lg:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-3 sm:gap-0">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">จัดการเมนู</h1>
        <button
          onClick={openCreate}
          className="btn-primary flex items-center gap-2 py-2 sm:py-2.5 px-3 sm:px-4 text-sm sm:text-base"
        >
          <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="hidden sm:inline">เพิ่มเมนูใหม่</span>
          <span className="sm:hidden">เพิ่ม</span>
        </button>
      </div>

      {/* grid: click card to edit */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-6">
        {menuItems.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => openEdit(item)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => (e.key === 'Enter' ? openEdit(item) : undefined)}
          >
            <div className="aspect-square bg-gray-100 flex items-center justify-center">
              {item.image ? (
                <img src={toAbsoluteUrl(item.image)} alt={item.name} className="w-full h-full object-cover" />
              ) : (
                <Coffee className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400" />
              )}
            </div>

            <div className="p-3 sm:p-4">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-gray-800 text-sm sm:text-base line-clamp-1">
                  {item.name}
                </h3>
                <span
                  className={`px-2 py-1 text-xs rounded-full ml-1 ${
                    item.available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}
                >
                  <span className="hidden sm:inline">{item.available ? 'พร้อมขาย' : 'ไม่พร้อมขาย'}</span>
                  <span className="sm:hidden">{item.available ? '✓' : '✗'}</span>
                </span>
              </div>

              {item.description && (
                <p className="text-xs sm:text-sm text-gray-600 mb-2 line-clamp-2">{item.description}</p>
              )}
              <p className="text-xs text-gray-500 mb-2 line-clamp-1">หมวดหมู่: {item.category}</p>

              <div className="flex items-center justify-between mb-2">
                <div className="space-y-1">
                  <div className="text-base sm:text-lg font-bold text-primary-600">
                    ฿{item.price.toFixed(2)}
                  </div>
                  {typeof item.cost === 'number' && (
                    <div className="text-xs text-gray-500">
                      <span className="hidden sm:inline">
                        ต้นทุน: ฿{item.cost.toFixed(2)} | กำไร: ฿{(item.price - item.cost).toFixed(2)}
                      </span>
                      <span className="sm:hidden">กำไร: ฿{(item.price - item.cost).toFixed(2)}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-1 sm:gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openEdit(item);
                    }}
                    className="p-1.5 sm:p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="แก้ไข"
                  >
                    <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(item.id);
                    }}
                    className="p-1.5 sm:p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="ลบ"
                  >
                    <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal with scroll + image preview */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/40 z-50 p-4 overflow-y-auto"
          style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
        >
          <div className="mx-auto bg-white w-full max-w-md rounded-2xl shadow-lg">
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
              <h3 className="text-lg font-bold text-gray-800">
                {editingItem ? 'แก้ไขเมนู' : 'เพิ่มเมนูใหม่'}
              </h3>
              <button
                className="p-1 rounded-lg hover:bg-gray-100"
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                title="ปิด"
              >
                <X />
              </button>
            </div>

            <div className="p-4 max-h-[92vh] overflow-y-auto">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">รูปเมนู</label>
                  <div className="w-full aspect-square bg-gray-50 rounded-xl flex items-center justify-center overflow-hidden mb-2">
                    {imagePreview ? (
                      <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-gray-400 flex flex-col items-center">
                        <ImageIcon />
                        <div className="text-xs mt-1">ยังไม่มีรูป</div>
                      </div>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadImage(f);
                    }}
                  />
                  {uploading && <div className="text-xs text-gray-500 mt-1">กำลังอัปโหลด…</div>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">ชื่อเมนู</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input-field w-full"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">ราคาขาย (บาท)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                      className="input-field w-full"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">ต้นทุน (บาท)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.cost}
                      onChange={(e) => setFormData({ ...formData, cost: Number(e.target.value) })}
                      className="input-field w-full"
                      required
                    />
                  </div>
                </div>

                {formData.price > 0 && formData.cost > 0 && (
                  <p className="text-sm text-gray-600">
                    กำไร: ฿{(formData.price - formData.cost).toFixed(2)} (
                    {(((formData.price - formData.cost) / formData.price) * 100).toFixed(1)}%)
                  </p>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">หมวดหมู่</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="input-field w-full"
                  >
                    <option value="">เลือกหมวดหมู่</option>
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <div className="text-xs text-gray-500 mt-1">
                    * ถ้าเลือกเป็นชื่อ (ไม่ใช่ตัวเลข) ระบบจะบันทึก categoryId = null เพื่อกัน error
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">คำอธิบาย</label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="input-field w-full"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="available"
                    checked={formData.available}
                    onChange={(e) => setFormData({ ...formData, available: e.target.checked })}
                    className="mr-2"
                  />
                  <label htmlFor="available" className="text-sm text-gray-700">
                    พร้อมขาย
                  </label>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    className="flex-1 btn-secondary"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                  >
                    ยกเลิก
                  </button>
                  <button type="submit" disabled={loading} className="flex-1 btn-primary">
                    {loading ? 'กำลังบันทึก...' : editingItem ? 'อัปเดต' : 'เพิ่มเมนู'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuPage;
