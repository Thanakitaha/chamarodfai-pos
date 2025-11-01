import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

import LoginPage from './pages/LoginPage';
import OrderPage from './pages/OrderPage';
import MenuPage from './pages/MenuPage';
import PromotionPage from './pages/PromotionPage';
import ReportsPage from './pages/ReportsPage';
import DailySalesPage from './pages/DailySalesPage';

function AppRoutes() {
  const location = useLocation();

  // เส้นทางสาธารณะ (ไม่ต้องมี Layout): /login
  if (location.pathname === '/login') {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        {/* แถม fallback เผื่อหลงมา / ไป /login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // เส้นทางหลังล็อกอิน (มี Layout ครอบ)
  return (
    <Layout>
      <Routes>
        {/* เข้าเว็บครั้งแรก (/) → เด้งตามสถานะล็อกอิน */}
        <Route path="/" element={<Navigate to="/order" replace />} />

        <Route
          path="/order"
          element={
            <ProtectedRoute title="ออเดอร์">
              <OrderPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/menu"
          element={
            <ProtectedRoute title="เมนู">
              <MenuPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/promotions"
          element={
            <ProtectedRoute title="โปรโมชัน">
              <PromotionPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute title="รายงานยอดขาย">
              <ReportsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/daily-sales"
          element={
            <ProtectedRoute title="สรุปรายวัน">
              <DailySalesPage />
            </ProtectedRoute>
          }
        />
        {/* อื่น ๆ → กลับ /order */}
        <Route path="*" element={<Navigate to="/order" replace />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppRoutes />

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: { background: '#363636', color: '#fff' },
        }}
      />
    </Router>
  );
}
