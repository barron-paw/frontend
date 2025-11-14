import { useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext.jsx';
import apiClient from '../api/client.js';
import './WhaleAddressesPanel.css';

const WHALE_UPDATE_INTERVAL = 6 * 60 * 60 * 1000; // 6 hours in milliseconds

export default function WhaleAddressesPanel() {
  const { language } = useLanguage();
  const isEnglish = language === 'en';
  const [whaleAddresses, setWhaleAddresses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [error, setError] = useState('');

  const fetchWhaleAddresses = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiClient.get('/whale-addresses');
      setWhaleAddresses(data.addresses || []);
      setLastUpdate(new Date());
    } catch (err) {
      setError(err.message || (isEnglish ? 'Failed to load whale addresses' : '加载巨鲸地址失败'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial load
    fetchWhaleAddresses();

    // Set up interval to fetch every 6 hours
    const interval = setInterval(fetchWhaleAddresses, WHALE_UPDATE_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const [copiedAddress, setCopiedAddress] = useState(null);

  const copyToClipboard = (address) => {
    if (!address) return;
    navigator.clipboard.writeText(address).then(() => {
      setCopiedAddress(address);
      setTimeout(() => setCopiedAddress(null), 2000);
    }).catch((err) => {
      console.error('Failed to copy address:', err);
    });
  };

  return (
    <section className="dashboard__section whale-addresses-panel">
      <div className="whale-addresses-panel__header">
        <div>
          <h2>{isEnglish ? 'Top Whale Addresses' : '巨鲸地址'}</h2>
          <p>
            {isEnglish
              ? 'Top 3 whale addresses automatically fetched from Hyperliquid every 6 hours. Click icon to copy address.'
              : '每 6 小时从 Hyperliquid 自动获取的前 3 个巨鲸地址。点击图标复制地址。'}
          </p>
        </div>
        {lastUpdate && (
          <div className="whale-addresses-panel__update-time">
            {isEnglish ? 'Last updated: ' : '最后更新：'}
            {lastUpdate.toLocaleString(language === 'en' ? 'en-US' : 'zh-CN')}
          </div>
        )}
      </div>

      {error && (
        <div className="whale-addresses-panel__error">
          {error}
        </div>
      )}

      {loading && !whaleAddresses.length ? (
        <div className="whale-addresses-panel__loading">
          {isEnglish ? 'Loading whale addresses...' : '正在加载巨鲸地址...'}
        </div>
      ) : (
        <div className="whale-addresses-panel__list">
          {whaleAddresses.length === 0 ? (
            <div className="whale-addresses-panel__empty">
              {isEnglish ? 'No whale addresses available.' : '暂无巨鲸地址。'}
            </div>
          ) : (
            whaleAddresses.map((whale, index) => (
              <div key={whale.address || index} className="whale-addresses-panel__item">
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', width: '100%' }}>
                  <div className="whale-addresses-panel__rank">#{index + 1}</div>
                  <div className="whale-addresses-panel__address-group" style={{ flex: 1 }}>
                    <span className="whale-addresses-panel__address-text">
                      {formatAddress(whale.address)}
                    </span>
                    <button
                      type="button"
                      className="whale-addresses-panel__copy-btn"
                      onClick={() => copyToClipboard(whale.address)}
                      title={isEnglish ? 'Click to copy' : '点击复制'}
                    >
                      {copiedAddress === whale.address ? (
                        <span style={{ color: '#4caf50' }}>✓</span>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                <div className="whale-addresses-panel__details">
                  <div className="whale-addresses-panel__detail-item">
                    <span className="whale-addresses-panel__detail-label">
                      {isEnglish ? 'Account Total Value' : '账户总价值'}
                    </span>
                    <span className="whale-addresses-panel__detail-value">
                      ${typeof whale.accountValue === 'number'
                        ? whale.accountValue.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })
                        : whale.accountValue || 'N/A'}
                    </span>
                  </div>
                  <div className="whale-addresses-panel__detail-item">
                    <span className="whale-addresses-panel__detail-label">
                      {isEnglish ? 'PnL' : '盈亏'}
                    </span>
                    <span 
                      className="whale-addresses-panel__detail-value"
                      style={{ color: (whale.pnl || 0) >= 0 ? '#4caf50' : '#f44336' }}
                    >
                      ${typeof whale.pnl === 'number'
                        ? `${whale.pnl >= 0 ? '+' : ''}${whale.pnl.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}`
                        : whale.pnl || 'N/A'}
                    </span>
                  </div>
                  <div className="whale-addresses-panel__detail-item">
                    <span className="whale-addresses-panel__detail-label">
                      {isEnglish ? 'Trades Count' : '交易次数'}
                    </span>
                    <span className="whale-addresses-panel__detail-value">
                      {whale.tradesCount || 0}
                    </span>
                  </div>
                  <div className="whale-addresses-panel__detail-item">
                    <span className="whale-addresses-panel__detail-label">
                      {isEnglish ? 'Win Rate' : '胜率'}
                    </span>
                    <span className="whale-addresses-panel__detail-value">
                      {typeof whale.winRate === 'number'
                        ? `${whale.winRate.toFixed(2)}%`
                        : whale.winRate || 'N/A'}
                    </span>
                  </div>
                  <div className="whale-addresses-panel__detail-item">
                    <span className="whale-addresses-panel__detail-label">
                      {isEnglish ? '7-Day Profit Rate' : '7天盈利率'}
                    </span>
                    <span 
                      className="whale-addresses-panel__detail-value"
                      style={{ color: (whale.profitRate || 0) >= 0 ? '#4caf50' : '#f44336' }}
                    >
                      {typeof whale.profitRate === 'number'
                        ? `${whale.profitRate >= 0 ? '+' : ''}${whale.profitRate.toFixed(2)}%`
                        : whale.profitRate || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {loading && whaleAddresses.length > 0 && (
        <div className="whale-addresses-panel__refreshing">
          {isEnglish ? 'Refreshing...' : '正在刷新...'}
        </div>
      )}
    </section>
  );
}

