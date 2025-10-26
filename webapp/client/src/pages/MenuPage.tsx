import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Coffee } from 'lucide-react';
import { toast } from 'react-hot-toast';
import apiConfig from '../services/api-config';
import { MenuItem } from '../types';

const MenuPage: React.FC = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    price: 0,
    cost: 0, // เพิ่มฟิลด์ต้นทุน
    category: '',
    description: '',
    available: true,
  });

  useEffect(() => {
    fetchMenuItems();
  }, []);

  const fetchMenuItems = async () => {
    try {
      const response = await apiConfig.menu.getAll();
      if (response.success && response.data) {
        setMenuItems(response.data);
      }
    } catch (error) {
      toast.error('ไม่สามารถโหลดเมนูได้');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingItem) {
        const response = await apiConfig.menu.update(editingItem.id, formData);
        if (response.success) {
          toast.success('อัปเดตเมนูสำเร็จ');
          fetchMenuItems();
        } else {
          toast.error(response.message || 'ไม่สามารถอัปเดตเมนูได้');
        }
      } else {
        const response = await apiConfig.menu.create(formData);
        if (response.success) {
          toast.success('เพิ่มเมนูสำเร็จ');
          fetchMenuItems();
        } else {
          toast.error(response.message || 'ไม่สามารถเพิ่มเมนูได้');
        }
      }
      
      setShowModal(false);
      resetForm();
    } catch (error) {
      toast.error('เกิดข้อผิดพลาด');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: MenuItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      price: item.price,
      cost: item.cost || 0, // เพิ่ม cost field
      category: item.category,
      description: item.description || '',
      available: item.available,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('ต้องการลบเมนูนี้ใช่หรือไม่?')) {
      try {
        const response = await apiConfig.menu.delete(id);
        if (response.success) {
          toast.success('ลบเมนูสำเร็จ');
          fetchMenuItems();
        } else {
          toast.error(response.message || 'ไม่สามารถลบเมนูได้');
        }
      } catch (error) {
        toast.error('ไม่สามารถลบเมนูได้');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      price: 0,
      cost: 0, // เพิ่ม cost field
      category: '',
      description: '',
      available: true,
    });
    setEditingItem(null);
  };

  const categories = Array.from(new Set([
    'เครื่องดื่ม',
    'ขนม', 
    'Topping',
    ...menuItems.map(item => item.category)
  ])).filter(Boolean);

  return (
    <div className="p-3 sm:p-4 lg:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-3 sm:gap-0">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">จัดการเมนู</h1>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="btn-primary flex items-center gap-2 py-2 sm:py-2.5 px-3 sm:px-4 text-sm sm:text-base"
        >
          <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="hidden sm:inline">เพิ่มเมนูใหม่</span>
          <span className="sm:hidden">เพิ่ม</span>
        </button>
      </div>

      {/* Menu Items Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-6">
        {menuItems.map(item => (
          <div key={item.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="aspect-square bg-gray-100 flex items-center justify-center">
              {item.image ? (
                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
              ) : (
                <Coffee className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400" />
              )}
            </div>
            
            <div className="p-3 sm:p-4">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-gray-800 text-sm sm:text-base line-clamp-1">{item.name}</h3>
                <span className={`px-2 py-1 text-xs rounded-full ml-1 ${
                  item.available 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  <span className="hidden sm:inline">{item.available ? 'พร้อมขาย' : 'ไม่พร้อมขาย'}</span>
                  <span className="sm:hidden">{item.available ? '✓' : '✗'}</span>
                </span>
              </div>
              
              <p className="text-xs sm:text-sm text-gray-600 mb-2 line-clamp-2">{item.description}</p>
              <p className="text-xs text-gray-500 mb-2 line-clamp-1">หมวดหมู่: {item.category}</p>
              
              <div className="flex items-center justify-between mb-2">
                <div className="space-y-1">
                  <div className="text-base sm:text-lg font-bold text-primary-600">
                    ฿{item.price.toFixed(2)}
                  </div>
                  {item.cost && (
                    <div className="text-xs text-gray-500">
                      <span className="hidden sm:inline">ต้นทุน: ฿{item.cost.toFixed(2)} | กำไร: ฿{(item.price - item.cost).toFixed(2)}</span>
                      <span className="sm:hidden">กำไร: ฿{(item.price - item.cost).toFixed(2)}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-1 sm:gap-2">
                  <button
                    onClick={() => handleEdit(item)}
                    className="p-1.5 sm:p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 sm:p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 sm:mb-6">
                {editingItem ? 'แก้ไขเมนู' : 'เพิ่มเมนูใหม่'}
              </h3>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ชื่อเมนู
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ราคาขาย (บาท)
                  </label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    className="input-field"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ต้นทุน (บาท)
                  </label>
                  <input
                    type="number"
                    value={formData.cost}
                    onChange={(e) => setFormData({ ...formData, cost: Number(e.target.value) })}
                    className="input-field"
                    min="0"
                    step="0.01"
                    required
                  />
                  {formData.price > 0 && formData.cost > 0 && (
                    <p className="text-sm text-gray-600 mt-1">
                      กำไร: ฿{(formData.price - formData.cost).toFixed(2)} 
                      ({(((formData.price - formData.cost) / formData.price) * 100).toFixed(1)}%)
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    หมวดหมู่
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="input-field"
                    required
                  >
                    <option value="">เลือกหมวดหมู่</option>
                    <option value="เครื่องดื่ม">เครื่องดื่ม</option>
                    <option value="ขนม">ขนม</option>
                    <option value="Topping">Topping</option>
                    {categories.filter(cat => !['เครื่องดื่ม', 'ขนม', 'Topping'].includes(cat)).map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    คำอธิบาย
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="input-field"
                    rows={3}
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

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 btn-secondary"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 btn-primary"
                  >
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
