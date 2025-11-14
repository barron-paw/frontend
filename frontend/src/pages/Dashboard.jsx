import { useState } from 'react';
import './Dashboard.css';
import Layout from '../components/Layout';
import WalletSelector from '../components/WalletSelector';
import MetricsGrid from '../components/MetricsGrid';
import PositionsTable from '../components/PositionsTable';
import FillsList from '../components/FillsList';
import StatusBanner from '../components/StatusBanner';
import LoadingIndicator from '../components/LoadingIndicator';
import useWalletData from '../hooks/useWalletData';
import AccountMenu from '../components/AccountMenu.jsx';
import SubscriptionPanel from '../components/SubscriptionPanel.jsx';
import MonitorConfigPanel from '../components/MonitorConfigPanel.jsx';
import BinanceFollowPanel from '../components/BinanceFollowPanel.jsx';
import WhaleAddressesPanel from '../components/WhaleAddressesPanel.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';

export function Dashboard() {
  const { language } = useLanguage();
  const isEnglish = language === 'en';
  const [activePage, setActivePage] = useState('monitor');
  const {
    selectedWallet,
    setSelectedWallet,
    summary,
    positions,
    fills,
    loading,
    error,
    refresh,
  } = useWalletData();

  const header = (
    <div className="dashboard__header">
      <div>
        <h1>Hyperliquid Monitor</h1>
        <p>
          {isEnglish
            ? 'Live positions, balances, and fills for your tracked wallets. Binance real-time order tracking.'
            : '实时查看跟踪钱包的持仓、余额与成交明细。币安实时下单跟踪。'}
        </p>
      </div>
    </div>
  );

  const footer = (
    <div className="dashboard__footer">
      <p>
        {isEnglish ? (
          <>
            Data polled directly from Hyperliquid public endpoints. Refresh interval 15s. Adjust via{' '}
            <code>useWalletData</code>.
          </>
        ) : (
          <>
            数据直接来自 Hyperliquid 公共接口，刷新间隔 15 秒，可在 <code>useWalletData</code> 中调整。
          </>
        )}
      </p>
      <p>
        {isEnglish ? 'Contact: ' : '联系邮箱：'}
        <a href="mailto:baobangran@gamil.com">baobangran@gamil.com</a>
      </p>
    </div>
  );

  return (
    <Layout header={header} actions={<AccountMenu />} footer={footer}>
      <div className="dashboard__tabs">
        <button
          type="button"
          className={activePage === 'monitor' ? 'dashboard__tab dashboard__tab--active' : 'dashboard__tab'}
          onClick={() => setActivePage('monitor')}
        >
          {isEnglish ? 'Monitoring' : '监控配置'}
        </button>
        <button
          type="button"
          className={activePage === 'automation' ? 'dashboard__tab dashboard__tab--active' : 'dashboard__tab'}
          onClick={() => setActivePage('automation')}
        >
          {isEnglish ? 'Automation' : '自动化配置'}
        </button>
      </div>

      <div style={{ display: activePage === 'monitor' ? 'block' : 'none' }}>
      <WhaleAddressesPanel />
      <SubscriptionPanel />
      <MonitorConfigPanel />

      <WalletSelector
        value={selectedWallet}
        onChange={setSelectedWallet}
        onRefresh={refresh}
          isLoading={loading}
      />

      {error ? (
          <StatusBanner
            kind="error"
            title={isEnglish ? 'Unable to fetch data' : '无法获取数据'}
            description={error}
          />
      ) : null}

      {loading ? <LoadingIndicator /> : null}

      <MetricsGrid summary={summary} />
      <PositionsTable positions={positions} />
      <FillsList fills={fills} />
      </div>
      <div className="dashboard__page" style={{ display: activePage === 'automation' ? 'block' : 'none' }}>
        <BinanceFollowPanel />
        
        <WalletSelector
          value={selectedWallet}
          onChange={setSelectedWallet}
          onRefresh={refresh}
          isLoading={loading}
        />

        {error ? (
          <StatusBanner
            kind="error"
            title={isEnglish ? 'Unable to fetch data' : '无法获取数据'}
            description={error}
          />
        ) : null}

        {loading ? <LoadingIndicator /> : null}

        <MetricsGrid summary={summary} />
        <PositionsTable positions={positions} />
        <FillsList fills={fills} />
      </div>
    </Layout>
  );
}

export default Dashboard;
