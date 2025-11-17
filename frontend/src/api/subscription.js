import apiClient from './client';

export function verifySubscription(txHash) {
  return apiClient.post('/subscription/verify', { txHash });
}

export function getSubscriptionPrice() {
  return apiClient.get('/subscription/price');
}