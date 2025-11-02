import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  ShoppingCart, 
  Menu, 
  Tag, 
  BarChart3, 
  Coffee,
  Settings,
  TrendingUp,
  LogOut,
  ShieldOff,
  PlayCircle
} from 'lucide-react';
import { useAuth } from '../stores/authStore';
import { toast } from 'react-hot-toast';

interface LayoutProps {
  children: React.ReactNode;
}

const API_BASE = (import.meta as any)?.env?.VITE_API_BASE || '/api';

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, logout } = useAuth();

  const [adminBusy, setAdminBusy] = useState(false);

  const navItems = [
    { path: '/order', icon: ShoppingCart, label: 'ออเดอร์', color: 'text-blue-600', protected: false },
    { path: '/daily-sales', icon: TrendingUp, label: 'ยอดขายรายวัน', color: 'text-indigo-600', protected: false },
    { path: '/menu', icon: Menu, label: 'จัดการเมนู', color: 'text-green-600', protected: true },
    { path: '/promotions', icon: Tag, label: 'โปรโมชั่น', color: 'text-purple-600', protected: true },
    { path: '/reports', icon: BarChart3, label: 'รายงาน', color: 'text-orange-600', protected: true },
  ];

  const isActive = (path: string) => location.pathname === path;

  const callAdmin = async (path: string, okMsgFallback: string) => {
    try {
      setAdminBusy(true);
      const res = await fetch(`${API_BASE}/admin/${path}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || data?.error || 'Request failed');
      toast.success(data?.message || okMsgFallback);
    } catch (err: any) {
      toast.error(err?.message || 'เกิดข้อผิดพลาด');
    } finally {
      setAdminBusy(false);
    }
  };

  const handleCloseShop = () => callAdmin('close-shop', 'ปิดร้านและสำรองข้อมูลสำเร็จ');
  const handleOpenShop  = () => callAdmin('open-shop', 'เปิดร้านสำเร็จ');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <Coffee className="w-6 h-6 sm:w-8 sm:h-8 text-primary-600" />
            <h1 className="text-lg sm:text-xl font-bold text-gray-800 truncate">
              CHA-MA-ROD-FAI POS
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {/* แสดงปุ่มแอดมินเฉพาะตอนล็อกอิน */}
            {isAuthenticated && (
              <div className="hidden sm:flex items-center gap-2 mr-1">
                <button
                  type="button"
                  onClick={handleCloseShop}
                  disabled={adminBusy}
                  className={`flex items-center gap-1 px-2 py-2 rounded-lg text-sm transition-colors
                    ${adminBusy ? 'opacity-60 cursor-not-allowed' : 'hover:bg-red-50'}
                    text-red-600`}
                  title="ปิดร้าน & สำรองข้อมูล"
                >
                  <ShieldOff className="w-4 h-4" />
                  <span className="hidden md:inline">ปิดร้าน</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenShop}
                  disabled={adminBusy}
                  className={`flex items-center gap-1 px-2 py-2 rounded-lg text-sm transition-colors
                    ${adminBusy ? 'opacity-60 cursor-not-allowed' : 'hover:bg-emerald-50'}
                    text-emerald-600`}
                  title="เปิดร้าน"
                >
                  <PlayCircle className="w-4 h-4" />
                  <span className="hidden md:inline">เปิดร้าน</span>
                </button>
              </div>
            )}

            {isAuthenticated ? (
              <button
                onClick={logout}
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors text-sm"
                title="ออกจากระบบ"
              >
                <LogOut className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline text-sm">ออกจากระบบ</span>
              </button>
            ) : (
              <button
                onClick={() => navigate('/menu')}
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors text-sm"
                title="เข้าสู่ระบบจัดการ"
              >
                <Settings className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline text-sm">เข้าสู่ระบบจัดการ</span>
              </button>
            )}
          </div>
        </div>

        {/* แถบปุ่มแอดมินสำหรับจอเล็ก (ซ่อนบน sm ขึ้นไป) */}
        {isAuthenticated && (
          <div className="sm:hidden px-4 pb-3 flex items-center gap-2">
            <button
              type="button"
              onClick={handleCloseShop}
              disabled={adminBusy}
              className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-sm border
                ${adminBusy ? 'opacity-60 cursor-not-allowed' : 'bg-white hover:bg-red-50'}
                text-red-600 border-red-200`}
              title="ปิดร้าน & สำรองข้อมูล"
            >
              <ShieldOff className="w-4 h-4" />
              <span>ปิดร้าน</span>
            </button>
            <button
              type="button"
              onClick={handleOpenShop}
              disabled={adminBusy}
              className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-sm border
                ${adminBusy ? 'opacity-60 cursor-not-allowed' : 'bg-white hover:bg-emerald-50'}
                text-emerald-600 border-emerald-200`}
              title="เปิดร้าน"
            >
              <PlayCircle className="w-4 h-4" />
              <span>เปิดร้าน</span>
            </button>
          </div>
        )}
      </header>

      <div className="flex flex-col lg:flex-row">
        {/* Sidebar - Mobile: Bottom navigation, Desktop: Side navigation */}
        <aside className="lg:w-64 bg-white shadow-sm order-2 lg:order-1">
          {/* Mobile Bottom Navigation */}
          <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
            <div className="flex justify-around items-center py-2">
              {navItems
                .filter(item => !item.protected || isAuthenticated)
                .slice(0, 4) // Show only first 4 items on mobile
                .map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.path}
                      onClick={() => navigate(item.path)}
                      className={`flex flex-col items-center gap-1 px-2 py-1 rounded-lg transition-colors min-w-0 ${
                        isActive(item.path)
                          ? 'bg-primary-50 text-primary-700'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${isActive(item.path) ? item.color : 'text-gray-400'}`} />
                      <span className="text-xs font-medium truncate max-w-16">{item.label.split(' ')[0]}</span>
                    </button>
                  );
                })}
            </div>
          </nav>

          {/* Desktop Sidebar Navigation */}
          <nav className="hidden lg:block p-4 min-h-screen">
            <ul className="space-y-2">
              {navItems
                .filter(item => !item.protected || isAuthenticated)
                .map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.path}>
                      <button
                        onClick={() => navigate(item.path)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                          isActive(item.path)
                            ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-600'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                        }`}
                      >
                        <Icon className={`w-5 h-5 ${isActive(item.path) ? item.color : 'text-gray-400'}`} />
                        <span className="font-medium">{item.label}</span>
                      </button>
                    </li>
                  );
                })}
            </ul>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-3 sm:p-4 lg:p-6 pb-20 lg:pb-6 order-1 lg:order-2">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
