import { useState } from 'react';
import { useLanguage } from '../context/LanguageContext.jsx';
import apiClient from '../api/client.js';
import './SimulatedFollowPanel.css';

export default function SimulatedFollowPanel() {
  const { language } = useLanguage();
  const isEnglish = language === 'en';
  const [walletAddress, setWalletAddress] = useState('');
  const [dayCount, setDayCount] = useState(7);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [tableExpanded, setTableExpanded] = useState(true);

  const handleSimulate = async () => {
    if (!walletAddress.trim()) {
      setError(isEnglish ? 'Please enter a wallet address' : '请输入钱包地址');
      return;
    }

    // 确保 dayCount 是有效的数字
    const validDayCount = Number(dayCount);
    if (isNaN(validDayCount) || validDayCount < 1 || validDayCount > 30) {
      setError(isEnglish ? 'Please enter a valid number of days (1-30)' : '请输入有效的交易天数（1-30）');
      setDayCount(7); // 恢复为默认值
      return;
    }

    setLoading(true);
    setError('');
    setData(null);

    try {
      const result = await apiClient.get(`/simulated-follow?address=${encodeURIComponent(walletAddress.trim())}&days=${validDayCount}`);
      // 验证返回的数据格式
      if (!result || typeof result !== 'object') {
        throw new Error(isEnglish ? 'Invalid response from server' : '服务器返回数据格式错误');
      }
      // 确保 dailyProfits 存在且是数组
      if (!result.dailyProfits || !Array.isArray(result.dailyProfits)) {
        console.error('Invalid dailyProfits data:', result);
        throw new Error(isEnglish ? 'Invalid daily profits data' : '每日利润数据格式错误');
      }
      setData(result);
    } catch (err) {
      console.error('Simulate follow error:', err);
      let errorMessage = err.response?.data?.detail || err.message || (isEnglish ? 'Failed to simulate follow' : '模拟跟单失败');
      
      // 处理 429 限流错误
      if (err.message && (err.message.includes('429') || err.message.includes('rate limit') || err.message.includes('Too Many Requests'))) {
        errorMessage = isEnglish 
          ? 'API rate limit exceeded. Please wait a few minutes and try again.' 
          : 'API 请求过于频繁，请稍等几分钟后重试。';
      }
      
      setError(errorMessage);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    try {
      const date = new Date(dateStr + 'T00:00:00Z');
      return date.toLocaleDateString(language === 'en' ? 'en-US' : 'zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <section className="dashboard__section simulated-follow">
      <div className="simulated-follow__header">
        <div>
          <h2>{isEnglish ? 'Simulated Follow Trading' : '模拟跟单盘'}</h2>
          <p>
            {isEnglish
              ? 'Simulate following a wallet\'s recent trades and calculate profit/loss. No login required.'
              : '模拟跟随指定钱包的最近交易，计算盈亏情况。无需登录即可使用。'}
          </p>
        </div>
      </div>

      <div className="simulated-follow__form">
        <div className="simulated-follow__input-group">
          <label className="simulated-follow__field">
            <span>{isEnglish ? 'Wallet Address' : '钱包地址'}</span>
            <input
              type="text"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              placeholder={isEnglish ? '0x...' : '0x...'}
              disabled={loading}
            />
          </label>

          <label className="simulated-follow__field">
            <span>{isEnglish ? 'Number of Days (Max 30)' : '交易天数（最多30天）'}</span>
            <input
              type="number"
              inputMode="numeric"
              pattern="[0-9]*"
              value={dayCount}
              onChange={(e) => {
                const inputValue = e.target.value;
                // 允许空值，以便用户可以清空输入
                if (inputValue === '') {
                  setDayCount('');
                  return;
                }
                const value = Number(inputValue);
                // 只接受1-30之间的数字
                if (!isNaN(value) && value >= 1 && value <= 30) {
                  setDayCount(value);
                }
              }}
              onBlur={(e) => {
                // 失去焦点时，如果值无效，恢复为默认值7
                const value = Number(e.target.value);
                if (isNaN(value) || value < 1 || value > 30) {
                  setDayCount(7);
                }
              }}
              min={1}
              max={30}
              disabled={loading}
              style={{
                WebkitAppearance: 'none',
                MozAppearance: 'textfield',
              }}
            />
          </label>

          <button
            type="button"
            onClick={handleSimulate}
            disabled={loading || !walletAddress.trim() || !dayCount || Number(dayCount) < 1 || Number(dayCount) > 30}
            className="simulated-follow__button"
          >
            {loading ? (isEnglish ? 'Calculating...' : '计算中...') : (isEnglish ? 'Simulate' : '开始模拟')}
          </button>
        </div>
      </div>

      {error && (
        <div className="simulated-follow__error">
          {error}
        </div>
      )}

      {data && data.dailyProfits && Array.isArray(data.dailyProfits) && (
        <div className="simulated-follow__results">
          <div className="simulated-follow__summary">
            <div className="simulated-follow__summary-item">
              <span className="simulated-follow__summary-label">
                {isEnglish ? 'Total PnL' : '总盈亏'}
              </span>
              <span
                className="simulated-follow__summary-value"
                style={{ color: (data.totalPnl || 0) >= 0 ? '#4caf50' : '#f44336' }}
              >
                ${(data.totalPnl || 0) >= 0 ? '+' : ''}{(data.totalPnl || 0).toFixed(2)}
              </span>
            </div>
            <div className="simulated-follow__summary-item">
              <span className="simulated-follow__summary-label">
                {isEnglish ? 'Total PnL %' : '总盈亏率'}
              </span>
              <span
                className="simulated-follow__summary-value"
                style={{ color: (data.totalPnlPercent || 0) >= 0 ? '#4caf50' : '#f44336' }}
              >
                {(data.totalPnlPercent || 0) >= 0 ? '+' : ''}{(data.totalPnlPercent || 0).toFixed(2)}%
              </span>
            </div>
            <div className="simulated-follow__summary-item">
              <span className="simulated-follow__summary-label">
                {isEnglish ? 'Win Rate' : '胜率'}
              </span>
              <span className="simulated-follow__summary-value">
                {(data.winRate || 0).toFixed(2)}%
              </span>
            </div>
            <div className="simulated-follow__summary-item">
              <span className="simulated-follow__summary-label">
                {isEnglish ? 'Winning Trades' : '盈利交易'}
              </span>
              <span className="simulated-follow__summary-value" style={{ color: '#4caf50' }}>
                {data.winningTrades || 0}
              </span>
            </div>
            <div className="simulated-follow__summary-item">
              <span className="simulated-follow__summary-label">
                {isEnglish ? 'Losing Trades' : '亏损交易'}
              </span>
              <span className="simulated-follow__summary-value" style={{ color: '#f44336' }}>
                {data.losingTrades || 0}
              </span>
            </div>
          </div>

          <div className="simulated-follow__trades">
            <div 
              style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: tableExpanded ? 'var(--space-md)' : '0',
                cursor: 'pointer',
                padding: 'var(--space-sm)',
                borderRadius: 'var(--radius-md)',
                transition: 'background-color 0.2s'
              }}
              onClick={() => setTableExpanded(!tableExpanded)}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                <span>{isEnglish ? 'Daily Profits' : '每日利润'}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  ({data.dailyProfits.length})
                </span>
              </h3>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setTableExpanded(!tableExpanded);
                }}
                style={{
                  padding: '4px 8px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  fontSize: '1.2rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'transform 0.2s'
                }}
                title={tableExpanded ? (isEnglish ? 'Collapse' : '收缩') : (isEnglish ? 'Expand' : '展开')}
              >
                {tableExpanded ? '▼' : '▶'}
              </button>
            </div>
            {tableExpanded && data.dailyProfits.length > 0 && (
              <div className="simulated-follow__trades-table">
                <table>
                <thead>
                  <tr>
                    <th>{isEnglish ? 'Date' : '日期'}</th>
                    <th>{isEnglish ? 'PnL' : '盈亏'}</th>
                    <th>{isEnglish ? 'PnL %' : '盈亏率'}</th>
                    <th>{isEnglish ? 'Trades' : '交易笔数'}</th>
                    <th>{isEnglish ? 'Winning' : '盈利'}</th>
                    <th>{isEnglish ? 'Losing' : '亏损'}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.dailyProfits.map((day, index) => (
                    <tr key={index}>
                      <td>{formatDate(day.date || '')}</td>
                      <td>
                        <span style={{ color: (day.pnl || 0) >= 0 ? '#4caf50' : '#f44336' }}>
                          {(day.pnl || 0) >= 0 ? '+' : ''}${(day.pnl || 0).toFixed(2)}
                        </span>
                      </td>
                      <td>
                        <span style={{ color: (day.pnlPercent || 0) >= 0 ? '#4caf50' : '#f44336' }}>
                          {(day.pnlPercent || 0) >= 0 ? '+' : ''}{(day.pnlPercent || 0).toFixed(2)}%
                        </span>
                      </td>
                      <td>{day.tradesCount || 0}</td>
                      <td style={{ color: '#4caf50' }}>{day.winningTrades || 0}</td>
                      <td style={{ color: '#f44336' }}>{day.losingTrades || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
            {tableExpanded && data.dailyProfits.length === 0 && (
              <div style={{ padding: 'var(--space-md)', textAlign: 'center', color: 'var(--text-secondary)' }}>
                {isEnglish ? 'No daily profits data available' : '暂无每日利润数据'}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

