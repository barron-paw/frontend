const normalizeBaseUrl = (value) => (value ? value.replace(/\/$/, '') : value);

// 检测是否为微信浏览器
function isWeChatBrowser() {
  if (typeof window === 'undefined' || !navigator || !navigator.userAgent) {
    return false;
  }
  return /MicroMessenger/i.test(navigator.userAgent);
}

// 自动检测 API 基础 URL
function getApiBaseUrl() {
  // 如果环境变量中设置了 API URL，优先使用
  const envBaseUrl = normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL);
  if (envBaseUrl) {
    return envBaseUrl;
  }
  
  // 微信浏览器优先使用相对路径，避免跨域问题
  if (isWeChatBrowser()) {
    return '/api';
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

// 获取备用 API URL（如果主URL失败时使用）
function getFallbackApiBaseUrl() {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    // 如果是主域名，备用URL使用相对路径（通过主域名代理）
    if (hostname === 'hypebot.top' || hostname === 'www.hypebot.top') {
      return '/api';
    }
  }
  return null;
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

// 内部请求函数，支持指定基础URL
async function _requestWithBaseUrl(baseUrl, path, options = {}) {
  // 确保路径以 / 开头
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  // 构建完整 URL
  const url = `${baseUrl}${normalizedPath}`;
  // 调试日志（仅在开发环境或移动端或微信浏览器）
  if (typeof window !== 'undefined' && (import.meta.env.DEV || /Mobile|Android|iPhone|iPad|MicroMessenger/i.test(navigator.userAgent))) {
    console.log('[API Client] Request URL:', url, 'Base URL:', baseUrl, 'Path:', normalizedPath, 'WeChat:', isWeChatBrowser());
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
}

async function request(path, options = {}, useFallback = true) {
  try {
    return await _requestWithBaseUrl(API_BASE_URL, path, options);
  } catch (err) {
    // 如果是网络错误（如 Failed to fetch），尝试使用备用URL
    if (err instanceof TypeError && err.message === 'Failed to fetch' && useFallback) {
      const fallbackBaseUrl = getFallbackApiBaseUrl();
      if (fallbackBaseUrl && fallbackBaseUrl !== API_BASE_URL) {
        console.log('[API Client] Primary URL failed, trying fallback:', fallbackBaseUrl);
        try {
          // 使用备用URL重试（不再次尝试fallback，避免无限循环）
          return await _requestWithBaseUrl(fallbackBaseUrl, path, options);
        } catch (fallbackErr) {
          console.error('[API Client] Fallback URL also failed:', fallbackErr);
          // 继续使用原始错误
        }
      }
      
      // 移动端友好的错误信息
      const isMobile = typeof window !== 'undefined' && /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent);
      const isAndroid = typeof window !== 'undefined' && /Android/i.test(navigator.userAgent);
      const isWeChat = isWeChatBrowser();
      let errorMsg;
      if (isWeChat) {
        errorMsg = `无法连接到服务器。\n\n微信浏览器访问提示：\n1. 请确保网络连接正常\n2. 尝试点击右上角"..."菜单，选择"刷新"\n3. 如仍无法访问，请尝试在系统浏览器中打开\n4. 检查是否被微信安全策略拦截\n\n如果问题持续，请联系技术支持。`;
      } else if (isAndroid) {
        errorMsg = `无法连接到服务器。\n\n可能的原因：\n1. 网络连接问题\n2. DNS解析失败（无法解析 api.hypebot.top）\n3. 防火墙阻止\n\n建议：\n- 检查网络连接\n- 尝试切换网络（WiFi/移动数据）\n- 清除浏览器缓存\n- 如仍无法访问，可能需要使用VPN或联系技术支持`;
      } else if (isMobile) {
        errorMsg = `无法连接到服务器。请检查网络连接或稍后重试。`;
      } else {
        const normalizedPath = path.startsWith('/') ? path : `/${path}`;
        const url = `${API_BASE_URL}${normalizedPath}`;
        errorMsg = `无法连接到服务器 (${url})。请检查：\n1. 后端服务是否正在运行\n2. API 地址是否正确\n3. 网络连接是否正常\n4. CORS 配置是否正确`;
      }
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
