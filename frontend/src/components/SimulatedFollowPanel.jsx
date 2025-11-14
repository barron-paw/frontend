import { useState } from 'react';
import { useLanguage } from '../context/LanguageContext.jsx';
import apiClient from '../api/client.js';
import './SimulatedFollowPanel.css';

export default function SimulatedFollowPanel() {
  const { language } = useLanguage();
  const isEnglish = language === 'en';
  const [walletAddress, setWalletAddress] = useState('');
  const [tradeCount, setTradeCount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [tableZoom, setTableZoom] = useState(1);

  const handleSimulate = async () => {
    if (!walletAddress.trim()) {
      setError(isEnglish ? 'Please enter a wallet address' : '请输入钱包地址');
      return;
    }

    setLoading(true);
    setError('');
    setData(null);

    try {
      const result = await apiClient.get(`/simulated-follow?address=${encodeURIComponent(walletAddress.trim())}&limit=${tradeCount}`);
      setData(result);
    } catch (err) {
      setError(err.message || (isEnglish ? 'Failed to simulate follow' : '模拟跟单失败'));
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timeMs) => {
    const date = new Date(timeMs);
    return date.toLocaleString(language === 'en' ? 'en-US' : 'zh-CN');
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
            <span>{isEnglish ? 'Number of Trades' : '交易笔数'}</span>
            <input
              type="number"
              value={tradeCount}
              onChange={(e) => {
                const value = Number(e.target.value);
                if (value >= 1 && value <= 30) {
                  setTradeCount(value);
                }
              }}
              min={1}
              max={30}
              disabled={loading}
            />
          </label>

          <button
            type="button"
            onClick={handleSimulate}
            disabled={loading || !walletAddress.trim()}
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

      {data && (
        <div className="simulated-follow__results">
          <div className="simulated-follow__summary">
            <div className="simulated-follow__summary-item">
              <span className="simulated-follow__summary-label">
                {isEnglish ? 'Total PnL' : '总盈亏'}
              </span>
              <span
                className="simulated-follow__summary-value"
                style={{ color: data.totalPnl >= 0 ? '#4caf50' : '#f44336' }}
              >
                ${data.totalPnl >= 0 ? '+' : ''}{data.totalPnl.toFixed(2)}
              </span>
            </div>
            <div className="simulated-follow__summary-item">
              <span className="simulated-follow__summary-label">
                {isEnglish ? 'Total PnL %' : '总盈亏率'}
              </span>
              <span
                className="simulated-follow__summary-value"
                style={{ color: data.totalPnlPercent >= 0 ? '#4caf50' : '#f44336' }}
              >
                {data.totalPnlPercent >= 0 ? '+' : ''}{data.totalPnlPercent.toFixed(2)}%
              </span>
            </div>
            <div className="simulated-follow__summary-item">
              <span className="simulated-follow__summary-label">
                {isEnglish ? 'Win Rate' : '胜率'}
              </span>
              <span className="simulated-follow__summary-value">
                {data.winRate.toFixed(2)}%
              </span>
            </div>
            <div className="simulated-follow__summary-item">
              <span className="simulated-follow__summary-label">
                {isEnglish ? 'Winning Trades' : '盈利交易'}
              </span>
              <span className="simulated-follow__summary-value" style={{ color: '#4caf50' }}>
                {data.winningTrades}
              </span>
            </div>
            <div className="simulated-follow__summary-item">
              <span className="simulated-follow__summary-label">
                {isEnglish ? 'Losing Trades' : '亏损交易'}
              </span>
              <span className="simulated-follow__summary-value" style={{ color: '#f44336' }}>
                {data.losingTrades}
              </span>
            </div>
          </div>

          <div className="simulated-follow__trades">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
              <h3 style={{ margin: 0 }}>{isEnglish ? 'Recent Trades' : '最近交易'}</h3>
              <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => setTableZoom(prev => Math.max(0.5, prev - 0.1))}
                  style={{
                    padding: '4px 8px',
                    background: 'var(--bg-secondary, rgba(255, 255, 255, 0.05))',
                    border: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
                    borderRadius: '4px',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    fontSize: '0.85rem'
                  }}
                  title={isEnglish ? 'Zoom out' : '缩小'}
                >
                  −
                </button>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', minWidth: '50px', textAlign: 'center' }}>
                  {Math.round(tableZoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setTableZoom(prev => Math.min(2.0, prev + 0.1))}
                  style={{
                    padding: '4px 8px',
                    background: 'var(--bg-secondary, rgba(255, 255, 255, 0.05))',
                    border: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
                    borderRadius: '4px',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    fontSize: '0.85rem'
                  }}
                  title={isEnglish ? 'Zoom in' : '放大'}
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={() => setTableZoom(1)}
                  style={{
                    padding: '4px 8px',
                    background: 'var(--bg-secondary, rgba(255, 255, 255, 0.05))',
                    border: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
                    borderRadius: '4px',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    marginLeft: 'var(--space-xs)'
                  }}
                  title={isEnglish ? 'Reset zoom' : '重置缩放'}
                >
                  {isEnglish ? 'Reset' : '重置'}
                </button>
              </div>
            </div>
            <div className="simulated-follow__trades-table">
              <table style={{ zoom: tableZoom }}>
                <thead>
                  <tr>
                    <th>{isEnglish ? 'Time' : '时间'}</th>
                    <th>{isEnglish ? 'Coin' : '币种'}</th>
                    <th>{isEnglish ? 'Side' : '方向'}</th>
                    <th>{isEnglish ? 'Price' : '价格'}</th>
                    <th>{isEnglish ? 'Size' : '数量'}</th>
                    <th>{isEnglish ? 'PnL' : '盈亏'}</th>
                    <th>{isEnglish ? 'PnL %' : '盈亏率'}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.trades.map((trade, index) => (
                    <tr key={index}>
                      <td>{formatTime(trade.timeMs)}</td>
                      <td>{trade.coin}</td>
                      <td>
                        <span
                          className={`simulated-follow__side simulated-follow__side--${trade.side}`}
                        >
                          {trade.side === 'buy' ? (isEnglish ? 'Buy' : '买入') : (isEnglish ? 'Sell' : '卖出')}
                        </span>
                      </td>
                      <td>${trade.price.toFixed(4)}</td>
                      <td>{trade.size.toFixed(4)}</td>
                      <td>
                        {trade.pnl !== null ? (
                          <span style={{ color: trade.pnl >= 0 ? '#4caf50' : '#f44336' }}>
                            {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
                          </span>
                        ) : (
                          <span style={{ color: '#888' }}>-</span>
                        )}
                      </td>
                      <td>
                        {trade.pnlPercent !== null ? (
                          <span style={{ color: trade.pnlPercent >= 0 ? '#4caf50' : '#f44336' }}>
                            {trade.pnlPercent >= 0 ? '+' : ''}{trade.pnlPercent.toFixed(2)}%
                          </span>
                        ) : (
                          <span style={{ color: '#888' }}>-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

