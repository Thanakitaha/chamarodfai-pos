import { create } from 'zustand';
import { authAPI } from '../services/api';

type User = {
  account_id: number;
  store_id: number;
  role: string;
  email: string;
  username?: string | null;
};

type AuthState = {
  user: User | null;
  isAuthenticated: boolean;
  login: (identifier: string, password: string) => Promise<boolean>;
  logout: () => void;
};

export const useAuth = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,

  login: async (identifier, password) => {
    if (!identifier?.trim() || !password) {
      // กันตั้งแต่ client
      return false;
    }
    try {
      const res = await authAPI.login({ identifier, password });
      if (res?.success) {
        const me = await authAPI.me();
        if (me?.success && me.data) {
          set({ user: me.data as unknown as User, isAuthenticated: true });
          return true;
        }
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  },

  logout: () => set({ user: null, isAuthenticated: false }),
}));
