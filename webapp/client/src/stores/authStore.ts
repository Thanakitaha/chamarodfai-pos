// src/stores/authStore.ts
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
  login: (identifierOrUsername: string, password: string) => Promise<boolean>;
  logout: () => void;
};

export const useAuth = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,

  login: async (identifierOrUsername, password) => {
    const id = identifierOrUsername?.trim();
    if (!id || !password) {
      return false;
    }
    try {
      const res = await authAPI.login({ identifierOrUsername: id, password });
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
