const normalizeBaseUrl = (value) => (value ? value.replace(/\/$/, '') : value);

// 自动检测 API 基础 URL
function getApiBaseUrl() {
  // 如果环境变量中设置了 API URL，优先使用
  const envBaseUrl = normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL);
  if (envBaseUrl) {
    return envBaseUrl;
  }
  
  // 自动检测：如果当前域名是 hypebot.top 或 www.hypebot.top，使用 api.hypebot.top
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    // 如果是主域名，使用 api 子域名
    if (hostname === 'hypebot.top' || hostname === 'www.hypebot.top') {
      return 'https://api.hypebot.top/api';
    }
    // 如果已经是 api 子域名，使用相对路径
    if (hostname === 'api.hypebot.top') {
      return '/api';
    }
    // 开发环境或 localhost，使用相对路径
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.') || hostname.startsWith('10.')) {
      return '/api';
    }
  }
  
  // 默认使用相对路径
  return '/api';
}

const API_BASE_URL = getApiBaseUrl();
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
  // 确保路径以 / 开头
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  // 构建完整 URL
  const url = `${API_BASE_URL}${normalizedPath}`;
  // 调试日志（仅在开发环境或移动端）
  if (typeof window !== 'undefined' && (import.meta.env.DEV || /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent))) {
    console.log('[API Client] Request URL:', url, 'Base URL:', API_BASE_URL, 'Path:', normalizedPath);
  }
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
      // 移动端友好的错误信息
      const isMobile = typeof window !== 'undefined' && /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent);
      const errorMsg = isMobile
        ? `无法连接到服务器。请检查网络连接或稍后重试。`
        : `无法连接到服务器 (${url})。请检查：\n1. 后端服务是否正在运行\n2. API 地址是否正确\n3. 网络连接是否正常\n4. CORS 配置是否正确`;
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
