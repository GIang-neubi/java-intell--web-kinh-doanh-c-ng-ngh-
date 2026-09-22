import api from './client';

export async function sendAiChat(message, history = []) {
  const response = await api.post('/ai/chat', { message, history });
  return response.data;
}

export async function getAiConfig() {
  const response = await api.get('/admin/ai/config');
  return response.data;
}

export async function updateAiConfig(config) {
  const response = await api.put('/admin/ai/config', config);
  return response.data;
}
