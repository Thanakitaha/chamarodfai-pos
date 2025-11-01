import React, { useState } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { Lock, User, Eye, EyeOff, Coffee } from 'lucide-react';
import { useAuth } from '../stores/authStore';

const LoginPage: React.FC = () => {
  const { isAuthenticated, login, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as any;

  const [identifier, setIdentifier] = useState(''); // email หรือ username
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');

  // ถ้าล็อกอินอยู่แล้ว ไม่ต้องเห็นหน้า login → ไปออเดอร์เลย
  if (isAuthenticated) {
    return <Navigate to="/order" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const ok = await login(identifier, password);
    if (ok) {
      const redirectTo = location?.state?.from || '/order';
      navigate(redirectTo, { replace: true });
    } else {
      setError('อีเมล/ชื่อผู้ใช้ หรือรหัสผ่านไม่ถูกต้อง');
    }
  };

  return (
    <div className="min-h-screen w-full bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <div className="flex items-center justify-center mb-6">
          <div className="flex items-center gap-3">
            <Coffee className="w-8 h-8 text-amber-600" />
            <h1 className="text-2xl font-semibold">POS System</h1>
          </div>
        </div>

        <h2 className="text-lg font-medium text-gray-800 mb-1">เข้าสู่ระบบ</h2>
        <p className="text-sm text-gray-500 mb-6">กรุณาเข้าสู่ระบบเพื่อเริ่มใช้งาน</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">อีเมลหรือชื่อผู้ใช้</label>
            <div className="relative">
              <User className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="text"
                className="w-full pl-9 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="email หรือ username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                autoFocus
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">รหัสผ่าน</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                type={showPw ? 'text' : 'password'}
                className="w-full pl-9 pr-10 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700"
                aria-label="Toggle password visibility"
              >
                {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-md bg-amber-600 text-white font-medium hover:bg-amber-700 transition disabled:opacity-60"
          >
            {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
