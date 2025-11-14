import apiClient from './client';

export function fetchMonitorConfig() {
  return apiClient.get('/config');
}

export function updateMonitorConfig(payload) {
  return apiClient.post('/config', payload);
}

export function fetchTelegramChatId() {
  return apiClient.get('/telegram/chat_id');
}