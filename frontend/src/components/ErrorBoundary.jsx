import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  render() {
    if (this.state.hasError) {
      const isWeChat = typeof navigator !== 'undefined' && /MicroMessenger/i.test(navigator.userAgent);
      // 尝试从localStorage获取语言设置
      let isEnglish = false;
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          const lang = window.localStorage.getItem('hm_language_preference');
          isEnglish = lang === 'en';
        }
      } catch (e) {
        // 忽略localStorage错误
      }
      
      return (
        <div style={{
          padding: '20px',
          maxWidth: '600px',
          margin: '50px auto',
          background: '#1a1a1a',
          border: '1px solid #555',
          borderRadius: '8px',
          color: '#fff',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <h2 style={{ color: '#ff4444', marginTop: 0 }}>
            {isEnglish ? '⚠️ Application Error' : '⚠️ 应用错误'}
          </h2>
          <p>
            {isEnglish 
              ? 'An error occurred while loading the application. Please try refreshing the page.'
              : '加载应用时发生错误，请尝试刷新页面。'}
          </p>
          {isWeChat && (
            <div style={{
              marginTop: '20px',
              padding: '15px',
              background: 'rgba(255, 193, 7, 0.1)',
              border: '1px solid rgba(255, 193, 7, 0.3)',
              borderRadius: '4px'
            }}>
              <p style={{ margin: 0, fontSize: '0.9rem' }}>
                {isEnglish
                  ? '💡 WeChat Browser Tip: If the page is blank, try clicking the menu (⋯) in the top right corner and select "Refresh" or "Open in Browser".'
                  : '💡 微信浏览器提示：如果页面空白，请点击右上角菜单（⋯），选择"刷新"或"在浏览器中打开"。'}
              </p>
            </div>
          )}
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '20px',
              padding: '10px 20px',
              background: '#5b7cfa',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            {isEnglish ? 'Refresh Page' : '刷新页面'}
          </button>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details style={{ marginTop: '20px', fontSize: '0.85rem' }}>
              <summary style={{ cursor: 'pointer', color: '#999' }}>
                {isEnglish ? 'Error Details' : '错误详情'}
              </summary>
              <pre style={{
                marginTop: '10px',
                padding: '10px',
                background: '#000',
                borderRadius: '4px',
                overflow: 'auto',
                maxHeight: '300px',
                fontSize: '0.8rem'
              }}>
                {this.state.error.toString()}
                {this.state.errorInfo && this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

