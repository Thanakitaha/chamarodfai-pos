import { create } from 'zustand';

type User = {
  account_id: number;
  store_id: number;
  full_name: string;
  role: 'owner'|'staff';
  email: string;
};

type AuthState = {
  user: User | null;
  isLoggedIn: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoggedIn: false,

  login: async (email: string, password: string) => {
    try {
      const resp = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ email, password })
      });
      const json = await resp.json();
      if (!resp.ok || !json?.success) return false;

      set({ user: json.data as User, isLoggedIn: true });
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  },

  logout: () => set({ user: null, isLoggedIn: false }),
}));
