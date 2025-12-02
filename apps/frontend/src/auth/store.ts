import { create } from 'zustand';
import axios from 'axios';

interface User {
  id: number;
  discord_id: string;
  username: string;
  avatar_url: string | null;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setToken: (token: string) => void;
  fetchUser: () => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: localStorage.getItem('token'),
  user: null,
  isAuthenticated: !!localStorage.getItem('token'),
  isLoading: false,

  setToken: (token: string) => {
    localStorage.setItem('token', token);
    set({ token, isAuthenticated: true });
    get().fetchUser();
  },

  fetchUser: async () => {
    const { token } = get();
    if (!token) return;

    set({ isLoading: true });
    try {
      const response = await axios.get('/api/users/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      set({ user: response.data, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch user:', error);
      set({ token: null, user: null, isAuthenticated: false, isLoading: false });
      localStorage.removeItem('token');
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ token: null, user: null, isAuthenticated: false });
  },
}));
