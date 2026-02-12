import apiClient, { setAuthToken, getAuthToken, setApiBaseUrl } from './client';

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

/** 多实例：获取当前用户应使用的实例 base_url 并切换 API 客户端，使后续请求只打对应用户实例 */
export async function ensureInstanceForUser() {
  try {
    const token = getAuthToken();
    if (!token) return;
    const res = await apiClient.get('/instance-for-user');
    if (res?.base_url) {
      setApiBaseUrl(res.base_url);
    }
  } catch (err) {
    console.debug('[ensureInstanceForUser]', err?.message || err);
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