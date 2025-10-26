import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Components
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import OrderPage from './pages/OrderPage';
import MenuPage from './pages/MenuPage';
import PromotionPage from './pages/PromotionPage';
import ReportsPage from './pages/ReportsPage';
import DailySalesPage from './pages/DailySalesPage';

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className="App">
        <Layout>
          <Routes>
            <Route path="/" element={<OrderPage />} />
            <Route path="/order" element={<OrderPage />} />
            <Route path="/daily-sales" element={<DailySalesPage />} />
            <Route path="/menu" element={
              <ProtectedRoute title="หน้าจัดการเมนู">
                <MenuPage />
              </ProtectedRoute>
            } />
            <Route path="/promotions" element={
              <ProtectedRoute title="หน้าโปรโมชั่น">
                <PromotionPage />
              </ProtectedRoute>
            } />
            <Route path="/reports" element={
              <ProtectedRoute title="หน้ารายงาน">
                <ReportsPage />
              </ProtectedRoute>
            } />
          </Routes>
        </Layout>
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#363636',
              color: '#fff',
            },
          }}
        />
      </div>
    </Router>
  );
}

export default App;
