const normalizeBaseUrl = (value) => (value ? value.replace(/\/$/, '') : value);

const envBaseUrl = normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL);
const API_BASE_URL = envBaseUrl || '/api';
const TOKEN_STORAGE_KEY = 'hm_auth_token';

let authToken = (typeof window !== 'undefined' && window.localStorage)
  ? window.localStorage.getItem(TOKEN_STORAGE_KEY)
  : null;

export function setAuthToken(token) {
  authToken = token || null;
  if (typeof window !== 'undefined' && window.localStorage) {
    if (token) {
      window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  }
}

export function getAuthToken() {
  return authToken;
}

async function request(path, options = {}) {
  const url = `${API_BASE_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }
  const config = {
    ...options,
    headers,
  };
  if (config.body && typeof config.body !== 'string') {
    config.body = JSON.stringify(config.body);
  }

  try {
    const response = await fetch(url, config);
    if (!response.ok) {
      let message = response.statusText || 'Request failed';
      let errorData = null;
      try {
        errorData = await response.json();
        message = errorData?.detail || errorData?.message || JSON.stringify(errorData);
      } catch (err) {
        const text = await response.text().catch(() => message);
        message = text || message;
      }
      const error = new Error(message || `Request failed with status ${response.status}`);
      error.response = { status: response.status, data: errorData };
      throw error;
    }
    if (response.status === 204) {
      return null;
    }
    const contentType = response.headers.get('Content-Type') || '';
    if (contentType.includes('application/json')) {
      return response.json();
    }
    return response.text();
  } catch (err) {
    // 如果是网络错误（如 Failed to fetch），提供更详细的错误信息
    if (err instanceof TypeError && err.message === 'Failed to fetch') {
      const errorMsg = `无法连接到服务器 (${url})。请检查：\n1. 后端服务是否正在运行\n2. API 地址是否正确\n3. 网络连接是否正常\n4. CORS 配置是否正确`;
      throw new Error(errorMsg);
    }
    throw err;
  }
}

export const apiClient = {
  get: (path, options) => request(path, { method: 'GET', ...options }),
  post: (path, body, options) => request(path, { method: 'POST', body, ...options }),
  put: (path, body, options) => request(path, { method: 'PUT', body, ...options }),
};

export default apiClient;
