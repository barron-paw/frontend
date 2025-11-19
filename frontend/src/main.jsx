import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { LanguageProvider } from './context/LanguageContext.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';

// 全局错误处理
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

// 检测微信浏览器并添加提示
if (typeof navigator !== 'undefined' && /MicroMessenger/i.test(navigator.userAgent)) {
  console.log('WeChat browser detected');
}

try {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Root element not found');
  }

  const root = createRoot(rootElement);
  root.render(
    <StrictMode>
      <ErrorBoundary>
        <LanguageProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </LanguageProvider>
      </ErrorBoundary>
    </StrictMode>
  );
} catch (error) {
  console.error('Failed to render app:', error);
  const rootElement = document.getElementById('root');
  if (rootElement) {
    const isWeChat = typeof navigator !== 'undefined' && /MicroMessenger/i.test(navigator.userAgent);
    rootElement.innerHTML = `
      <div style="padding: 20px; max-width: 600px; margin: 50px auto; background: #1a1a1a; border: 1px solid #555; border-radius: 8px; color: #fff; font-family: system-ui, -apple-system, sans-serif;">
        <h2 style="color: #ff4444; margin-top: 0;">⚠️ 初始化错误</h2>
        <p>应用初始化失败，请尝试刷新页面。</p>
        ${isWeChat ? '<p style="margin-top: 20px; padding: 15px; background: rgba(255, 193, 7, 0.1); border: 1px solid rgba(255, 193, 7, 0.3); border-radius: 4px; font-size: 0.9rem;">💡 微信浏览器提示：如果页面空白，请点击右上角菜单（⋯），选择"刷新"或"在浏览器中打开"。</p>' : ''}
        <button onclick="window.location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #5b7cfa; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 1rem;">刷新页面</button>
      </div>
    `;
  }
}
