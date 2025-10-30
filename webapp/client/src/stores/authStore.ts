import { create } from 'zustand';
import * as api from '../services/api';

type User = {
  account_id: number;
  store_id: number;
  full_name: string;
  role: string;
  email: string;
  username?: string | null;
};

type AuthState = {
  user: User | null;
  // เปลี่ยนให้รับ identifier
  login: (identifier: string, password: string) => Promise<boolean>;
  logout: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,

  login: async (identifier: string, password: string) => {
    try {
      const res = await api.login(identifier, password);
      if (res?.success) {
        set({ user: res.data as User });
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  },

  logout: () => set({ user: null })
}));
