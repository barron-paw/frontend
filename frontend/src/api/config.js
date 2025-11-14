import apiClient from './client';

export function fetchMonitorConfig() {
  return apiClient.get('/config');
}

export function updateMonitorConfig(payload) {
  return apiClient.post('/config', payload);
}

export function getTelegramVerificationCode() {
  return apiClient.get('/telegram/verification_code');
}

export function fetchTelegramChatId() {
  return apiClient.get('/telegram/chat_id');
}