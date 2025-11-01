// src/stores/authStore.ts
import { create } from 'zustand';
import { authAPI } from '../services/api';

type User = {
  account_id: number | string;
  store_id: number | string;
  role: string;
  email: string;
  username?: string | null;
};

type AuthState = {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (identifierOrUsername: string, password: string) => Promise<boolean>;
  logout: () => void;
  hydrate: () => Promise<boolean>;
};

export const useAuth = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  loading: false,

  login: async (identifierOrUsername: string, password: string) => {
    set({ loading: true });
    try {
      const res = await authAPI.login({ identifierOrUsername, password });

      if (res?.success) {
        // 1) ถ้า backend ส่ง token มาก็เก็บไว้
        const token = (res as any)?.data?.token as string | undefined;
        if (token) {
          try { localStorage.setItem('authToken', token); } catch {}

          // พยายามดึง me เพื่อ sync user
          try {
            const me = await authAPI.me();
            if (me?.success && me.data) {
              set({ user: me.data as unknown as User, isAuthenticated: true, loading: false });
              return true;
            }
          } catch (e) {
            console.error('auth.me() failed after token login:', e);
          }
        }

        // 2) ถ้าไม่มี token แต่ data คือ user (อย่างที่คุณเจอ)
        if ((res as any).data && !(res as any).data.token) {
          set({
            user: (res as any).data as unknown as User,
            isAuthenticated: true,
            loading: false,
          });
          return true;
        }
      }
    } catch (e) {
      console.error('login error:', e);
    }
    set({ loading: false });
    return false;
  },

  logout: () => {
    try { localStorage.removeItem('authToken'); } catch {}
    set({ user: null, isAuthenticated: false });
  },

  hydrate: async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return false;
      const me = await authAPI.me();
      if (me?.success && me.data) {
        set({ user: me.data as unknown as User, isAuthenticated: true });
        return true;
      }
    } catch (e) {
      console.error('hydrate error:', e);
    }
    return false;
  },
}));
