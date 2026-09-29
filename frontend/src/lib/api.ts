import axios from 'axios';
import { useAuthStore } from '@/store/authStore';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Routes that actually require a logged-in session. A 401 from a background request made on any
// other page (e.g. the public landing page fetching optional data with a stale token) should just
// clear the stale session quietly — it must never force-navigate someone away from a public page.
const PROTECTED_PATH_PREFIXES = ['/dashboard', '/profile', '/verify-identity'];

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      useAuthStore.getState().logout();
      const isOnProtectedPage = PROTECTED_PATH_PREFIXES.some((prefix) => window.location.pathname.startsWith(prefix));
      if (isOnProtectedPage && !window.location.pathname.includes('/auth')) {
        window.location.href = '/auth/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
