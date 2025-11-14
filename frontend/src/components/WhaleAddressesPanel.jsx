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

  const copyToClipboard = (address) => {
    navigator.clipboard.writeText(address).then(() => {
      // Could add a toast notification here
    });
  };

  return (
    <section className="dashboard__section whale-addresses-panel">
      <div className="whale-addresses-panel__header">
        <div>
          <h2>{isEnglish ? 'Top Whale Addresses' : '巨鲸地址'}</h2>
          <p>
            {isEnglish
              ? 'Top 3 whale addresses updated every 6 hours. Click to copy address.'
              : '每 6 小时更新一次的前 3 个巨鲸地址。点击地址可复制。'}
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
                <div className="whale-addresses-panel__rank">#{index + 1}</div>
                <div className="whale-addresses-panel__address-wrapper">
                  <button
                    type="button"
                    className="whale-addresses-panel__address"
                    onClick={() => copyToClipboard(whale.address)}
                    title={isEnglish ? 'Click to copy' : '点击复制'}
                  >
                    {formatAddress(whale.address)}
                  </button>
                  {whale.balance && (
                    <div className="whale-addresses-panel__balance">
                      {isEnglish ? 'Balance: ' : '余额：'}
                      {typeof whale.balance === 'number'
                        ? whale.balance.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })
                        : whale.balance}
                      {' USDT'}
                    </div>
                  )}
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

