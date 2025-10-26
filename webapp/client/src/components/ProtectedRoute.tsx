import React, { useState } from 'react';
import { useAuth } from '../stores/authStore';
import LoginModal from './LoginModal';

interface ProtectedRouteProps {
  children: React.ReactNode;
  title: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, title }) => {
  const { isAuthenticated, login } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(!isAuthenticated);

  const handleLogin = (password: string) => {
    const success = login(password);
    if (success) {
      setShowLoginModal(false);
    }
    return success;
  };

  if (!isAuthenticated) {
    return (
      <>
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <div className="text-center">
            <div className="mb-4">
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">🔒</span>
              </div>
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">เข้าสู่{title}</h2>
            <p className="text-gray-600 mb-4">กรุณาใส่รหัสผ่านเพื่อเข้าใช้งาน</p>
            <button
              onClick={() => setShowLoginModal(true)}
              className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              เข้าสู่ระบบ
            </button>
          </div>
        </div>
        <LoginModal
          isOpen={showLoginModal}
          onLogin={handleLogin}
          onClose={() => setShowLoginModal(false)}
          title={title}
        />
      </>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
