import { create } from 'zustand';
import { authApi, userApi } from '@/lib/api';

interface User {
  id: string;
  username: string;
  nickname: string;
  avatarUrl?: string;
  bio?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (account: string, password: string) => Promise<void>;
  register: (data: { username: string; password: string; nickname?: string; email?: string }) => Promise<void>;
  logout: () => void;
  fetchUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: typeof window !== 'undefined' ? localStorage.getItem('token') : null,
  isLoading: false,

  login: async (account, password) => {
    const res: any = await authApi.login({ account, password });
    const { accessToken, user } = res;
    localStorage.setItem('token', accessToken);
    set({ token: accessToken, user });
  },

  register: async (data) => {
    const res: any = await authApi.register(data);
    const { accessToken, user } = res;
    localStorage.setItem('token', accessToken);
    set({ token: accessToken, user });
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ token: null, user: null });
  },

  fetchUser: async () => {
    set({ isLoading: true });
    try {
      const res: any = await userApi.getMe();
      set({ user: res, isLoading: false });
    } catch {
      set({ user: null, token: null, isLoading: false });
      localStorage.removeItem('token');
    }
  },
}));
