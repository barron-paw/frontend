import apiClient, { setAuthToken, getAuthToken } from './client';

export async function loginUser(payload) {
  try {
    const response = await apiClient.post('/auth/login', payload);
    if (response?.token) {
      setAuthToken(response.token);
    }
    return response?.user || null;
  } catch (err) {
    // 记录详细错误信息用于调试
    console.error('[loginUser] Error:', err);
    throw err;
  }
}

export async function registerUser(payload) {
  const response = await apiClient.post('/auth/register', payload);
  if (response?.token) {
    setAuthToken(response.token);
  }
  return response?.user || null;
}

export async function fetchCurrentUser() {
  try {
    const token = getAuthToken();
    if (!token) {
      return null;
    }
    const user = await apiClient.get('/auth/me');
    return user;
  } catch (error) {
    setAuthToken(null);
    return null;
  }
}

export function logoutUser() {
  setAuthToken(null);
}

export function requestVerificationCode(payload) {
  return apiClient.post('/auth/request_verification', payload);
}

export function forgotPassword(payload) {
  return apiClient.post('/auth/forgot-password', payload);
}

export function resetPassword(payload) {
  return apiClient.post('/auth/reset-password', payload);
}

export async function getInvitationStats() {
  try {
    const response = await apiClient.get('/invitation/stats');
    return response;
  } catch (err) {
    console.error('[getInvitationStats] Error:', err);
    throw err;
  }
}