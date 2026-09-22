import api, { getErrorMessage } from './client';

export async function loginRequest(username, password) {
  const { data } = await api.post('/auth/login', { username, password });
  if (!data.success) {
    throw new Error(data.message || 'Đăng nhập thất bại');
  }
  return data.data;
}

export async function registerRequest(payload) {
  const { data } = await api.post('/auth/register', payload);
  if (!data.success) {
    throw new Error(data.message || 'Đăng ký thất bại');
  }
  return data.data;
}

export { getErrorMessage };
