import apiClient from './client';

export function fetchWecomConfig() {
  return apiClient.get('/wecom');
}

export function saveWecomConfig(payload) {
  return apiClient.post('/wecom', payload);
}

