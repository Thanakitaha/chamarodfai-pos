import { create } from 'zustand';
import * as api from '../services/api';

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

// ✅ export แบบ named: useAuth
export const useAuth = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,

  login: async (identifier: string, password: string) => {
    try {
      const res = await api.login(identifier, password);
      if (res?.success && res.data) {
        set({ user: res.data as User, isAuthenticated: true });
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  },

  logout: () => set({ user: null, isAuthenticated: false }),
}));
