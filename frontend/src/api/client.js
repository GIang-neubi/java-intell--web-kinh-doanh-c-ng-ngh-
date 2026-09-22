import axios from 'axios';
import { useAuthStore } from '../store';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  const isAuthEndpoint = config.url?.includes('/auth/login') || config.url?.includes('/auth/register');
  if (token && !isAuthEndpoint) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (!error.config?.url?.includes('/auth/login')) {
        useAuthStore.getState().logout();
        if (!window.location.pathname.startsWith('/login')) {
          window.location.href = '/login';
        }
      }
    }
    if (error.response?.status === 403) {
      const serverMsg = error.response?.data?.message || (typeof error.response?.data === 'string' ? error.response.data : '');
      error.message = serverMsg || 'Bạn không có quyền thực hiện thao tác này.';
    }
    return Promise.reject(error);
  }
);

export default api;

export function getErrorMessage(error, fallback = 'Đã xảy ra lỗi. Vui lòng thử lại.') {
  const data = error?.response?.data;
  if (data?.data && typeof data.data === 'object' && !Array.isArray(data.data)) {
    const fieldErrors = Object.values(data.data).filter(Boolean);
    if (fieldErrors.length) return fieldErrors.join('. ');
  }
  return data?.message || error?.message || fallback;
}

export function getFieldErrors(error) {
  const data = error?.response?.data?.data;
  if (data && typeof data === 'object' && !Array.isArray(data)) return data;
  return {};
}
