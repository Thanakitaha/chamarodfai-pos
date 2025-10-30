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

  // ✅ รับ (identifier, password) ให้ตรงกับ LoginModal
  const handleLogin = async (identifier: string, password: string) => {
    const success = await login(identifier, password);
    if (success) setShowLoginModal(false);
    return success;
  };

  if (!isAuthenticated || showLoginModal) {
    return (
      <>
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
