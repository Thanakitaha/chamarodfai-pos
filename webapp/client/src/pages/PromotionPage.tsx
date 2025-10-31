import React, { useEffect, useState } from 'react';
import { Tag, Calendar, Percent, DollarSign, Plus, Edit2, Trash2, ToggleLeft, ToggleRight, Save, X } from 'lucide-react';
import { promotionAPI } from '../services/api';
import { Promotion } from '../types';
import { toast } from 'react-hot-toast';

type FormState = {
  id?: number;
  name: string;
  description?: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderAmount?: number;
  startDate: string; // yyyy-mm-dd
  endDate: string;   // yyyy-mm-dd
  active: boolean;
};

const emptyForm: FormState = {
  name: '',
  description: '',
  discountType: 'percentage',
  discountValue: 10,
  minOrderAmount: 0,
  startDate: new Date().toISOString().slice(0,10),
  endDate: new Date(new Date().setFullYear(new Date().getFullYear()+1)).toISOString().slice(0,10),
  active: true,
};

const PromotionPage: React.FC = () => {
  const [items, setItems] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<FormState | null>(null);
  const [creating, setCreating] = useState<FormState>(emptyForm);

  const load = async () => {
    setLoading(true);
    try {
      const res = await promotionAPI.list(false);
      if (res.success) setItems(res.data || []);
      else toast.error(res.error || 'โหลดโปรโมชั่นไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const onCreate = async () => {
    try {
      const res = await promotionAPI.create(creating);
      if (!res.success) throw new Error(res.error || 'สร้างโปรโมชั่นไม่สำเร็จ');
      toast.success('สร้างโปรโมชั่นแล้ว');
      setCreating(emptyForm);
      await load();
    } catch (e: any) { toast.error(e.message); }
  };

  const onUpdate = async () => {
    if (!editing?.id) return;
    try {
      const res = await promotionAPI.update(editing.id, editing);
      if (!res.success) throw new Error(res.error || 'อัปเดตไม่สำเร็จ');
      toast.success('อัปเดตโปรโมชั่นแล้ว');
      setEditing(null);
      await load();
    } catch (e: any) { toast.error(e.message); }
  };

  const onDelete = async (id: number) => {
    if (!confirm('ลบโปรโมชั่นนี้?')) return;
    const res = await promotionAPI.remove(id);
    if (!res.success) return toast.error(res.error || 'ลบไม่สำเร็จ');
    toast.success('ลบแล้ว');
    await load();
  };

  const onToggle = async (id: number) => {
    const res = await promotionAPI.toggle(id);
    if (!res.success) return toast.error(res.error || 'สลับสถานะไม่สำเร็จ');
    toast.success(res.data?.active ? 'เปิดใช้งาน' : 'ปิดใช้งาน');
    await load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Tag className="w-6 h-6 text-indigo-600" />
        <h2 className="text-xl font-semibold">โปรโมชั่น</h2>
      </div>

      {/* Create */}
      <div className="bg-white rounded-lg shadow-sm border p-4 space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <Plus className="w-5 h-5 text-green-600" />
          <div className="font-medium">สร้างโปรโมชั่น</div>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          <input className="border p-2 rounded" placeholder="ชื่อ" value={creating.name} onChange={e=>setCreating({...creating,name:e.target.value})}/>
          <input className="border p-2 rounded" placeholder="คำอธิบาย" value={creating.description} onChange={e=>setCreating({...creating,description:e.target.value})}/>
          <select className="border p-2 rounded" value={creating.discountType} onChange={e=>setCreating({...creating,discountType: e.target.value as any})}>
            <option value="percentage">เปอร์เซ็นต์</option>
            <option value="fixed">หักเป็นจำนวนเงินคงที่</option>
          </select>
          <input type="number" className="border p-2 rounded" placeholder="มูลค่าส่วนลด" value={creating.discountValue} onChange={e=>setCreating({...creating,discountValue:Number(e.target.value)})}/>
          <input type="number" className="border p-2 rounded" placeholder="ยอดขั้นต่ำ" value={creating.minOrderAmount} onChange={e=>setCreating({...creating,minOrderAmount:Number(e.target.value)})}/>
          <input type="date" className="border p-2 rounded" value={creating.startDate} onChange={e=>setCreating({...creating,startDate:e.target.value})}/>
          <input type="date" className="border p-2 rounded" value={creating.endDate} onChange={e=>setCreating({...creating,endDate:e.target.value})}/>
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={creating.active} onChange={e=>setCreating({...creating,active:e.target.checked})}/>
            Active
          </label>
        </div>
        <button onClick={onCreate} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">บันทึก</button>
      </div>

      {/* List */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-4 border-b font-medium">รายการโปรโมชั่น</div>
        {loading ? (
          <div className="p-6 text-gray-500">กำลังโหลด…</div>
        ) : items.length === 0 ? (
          <div className="p-6 text-gray-500">ยังไม่มีโปรโมชั่น</div>
        ) : (
          <div className="divide-y">
            {items.map(p => (
              <div key={p.id} className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <div className="font-medium">{p.name} {p.active ? <span className="text-green-600">(Active)</span> : <span className="text-gray-500">(Inactive)</span>}</div>
                  <div className="text-sm text-gray-600">{p.description}</div>
                  <div className="text-sm text-gray-600 flex gap-3 mt-1">
                    <span className="inline-flex items-center gap-1"><Percent className="w-4 h-4"/>{p.discountType==='percentage' ? `${p.discountValue}%` : `฿${p.discountValue}`}</span>
                    <span className="inline-flex items-center gap-1"><DollarSign className="w-4 h-4"/>ขั้นต่ำ {p.minOrderAmount ?? 0}</span>
                    <span className="inline-flex items-center gap-1"><Calendar className="w-4 h-4"/>{p.startDate?.slice(0,10)} - {p.endDate?.slice(0,10)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={()=>setEditing({
                    id: Number(p.id),
                    name: p.name,
                    description: p.description || '',
                    discountType: p.discountType,
                    discountValue: p.discountValue,
                    minOrderAmount: p.minOrderAmount ?? 0,
                    startDate: p.startDate.slice(0,10),
                    endDate: p.endDate.slice(0,10),
                    active: p.active,
                  })} className="px-3 py-1.5 border rounded inline-flex items-center gap-1 hover:bg-gray-50"><Edit2 className="w-4 h-4"/>แก้ไข</button>
                  <button onClick={()=>onToggle(Number(p.id))} className="px-3 py-1.5 border rounded inline-flex items-center gap-1 hover:bg-gray-50">
                    {p.active ? <ToggleRight className="w-4 h-4 text-green-600"/> : <ToggleLeft className="w-4 h-4 text-gray-500"/>}
                    สลับ
                  </button>
                  <button onClick={()=>onDelete(Number(p.id))} className="px-3 py-1.5 border rounded inline-flex items-center gap-1 hover:bg-red-50 text-red-600"><Trash2 className="w-4 h-4"/>ลบ</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit dialog (inline แบบง่าย ๆ ) */}
      {editing && (
        <div className="bg-white rounded-lg shadow-sm border p-4 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Edit2 className="w-5 h-5 text-indigo-600" />
            <div className="font-medium">แก้ไขโปรโมชั่น</div>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <input className="border p-2 rounded" placeholder="ชื่อ" value={editing.name} onChange={e=>setEditing({...editing,name:e.target.value})}/>
            <input className="border p-2 rounded" placeholder="คำอธิบาย" value={editing.description} onChange={e=>setEditing({...editing,description:e.target.value})}/>
            <select className="border p-2 rounded" value={editing.discountType} onChange={e=>setEditing({...editing,discountType: e.target.value as any})}>
              <option value="percentage">เปอร์เซ็นต์</option>
              <option value="fixed">หักเป็นจำนวนเงินคงที่</option>
            </select>
            <input type="number" className="border p-2 rounded" placeholder="มูลค่าส่วนลด" value={editing.discountValue} onChange={e=>setEditing({...editing,discountValue:Number(e.target.value)})}/>
            <input type="number" className="border p-2 rounded" placeholder="ยอดขั้นต่ำ" value={editing.minOrderAmount} onChange={e=>setEditing({...editing,minOrderAmount:Number(e.target.value)})}/>
            <input type="date" className="border p-2 rounded" value={editing.startDate} onChange={e=>setEditing({...editing,startDate:e.target.value})}/>
            <input type="date" className="border p-2 rounded" value={editing.endDate} onChange={e=>setEditing({...editing,endDate:e.target.value})}/>
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={editing.active} onChange={e=>setEditing({...editing,active:e.target.checked})}/>
              Active
            </label>
          </div>
          <div className="flex gap-2">
            <button onClick={onUpdate} className="px-4 py-2 bg-indigo-600 text-white rounded inline-flex items-center gap-2 hover:bg-indigo-700"><Save className="w-4 h-4"/>บันทึก</button>
            <button onClick={()=>setEditing(null)} className="px-4 py-2 border rounded inline-flex items-center gap-2 hover:bg-gray-50"><X className="w-4 h-4"/>ยกเลิก</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PromotionPage;
