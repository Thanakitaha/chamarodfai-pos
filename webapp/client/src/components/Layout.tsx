import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  ShoppingCart, 
  Menu, 
  Tag, 
  BarChart3, 
  Coffee,
  Settings,
  TrendingUp,
  LogOut
} from 'lucide-react';
import { useAuth } from '../stores/authStore';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, logout } = useAuth();

  const navItems = [
    { path: '/order', icon: ShoppingCart, label: 'ออเดอร์', color: 'text-blue-600', protected: false },
    { path: '/daily-sales', icon: TrendingUp, label: 'ยอดขายรายวัน', color: 'text-indigo-600', protected: false },
    { path: '/menu', icon: Menu, label: 'จัดการเมนู', color: 'text-green-600', protected: true },
    { path: '/promotions', icon: Tag, label: 'โปรโมชั่น', color: 'text-purple-600', protected: true },
    { path: '/reports', icon: BarChart3, label: 'รายงาน', color: 'text-orange-600', protected: true },
  ];

  const isActive = (path: string) => location.pathname === path;

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
