import { useEffect, useMemo, useState } from 'react';
import { fetchBinanceFollowConfig, saveBinanceFollowConfig } from '../api/binance.js';
import { useLanguage } from '../context/LanguageContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const MODE_OPTIONS = [
  { value: 'fixed', labelZh: '固定份额', labelEn: 'Fixed size' },
  { value: 'percentage', labelZh: '按百分比', labelEn: 'Percentage' },
];

const STATUS_LABELS = {
  active: {
    zh: '运行中',
    en: 'Active',
  },
  disabled: {
    zh: '未启用',
    en: 'Disabled',
  },
  enabled_but_disabled: {
    zh: '已启用',
    en: 'Enabled',
  },
  stopped_by_loss: {
    zh: '已因止损暂停',
    en: 'Stopped by stop-loss',
  },
};

const DEFAULT_FORM = {
  enabled: false,
  walletAddress: '',
  mode: 'fixed',
  amount: '',
  stopLossAmount: '',
  maxPosition: '',
  minOrderSize: '',
  apiKey: '',
  apiSecret: '',
};

export default function BinanceFollowPanel() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const isEnglish = language === 'en';

  const canEdit = user?.can_access_monitor;

  const [form, setForm] = useState(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [hasApiKey, setHasApiKey] = useState(false);
  const [hasApiSecret, setHasApiSecret] = useState(false);
  const [followStatus, setFollowStatus] = useState('disabled');
  const [stopReason, setStopReason] = useState('');
  const [baselineBalance, setBaselineBalance] = useState(null);
  const [resetCredentials, setResetCredentials] = useState(false);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      if (!canEdit) {
        return;
      }
      setLoading(true);
      setStatusMessage('');
      try {
        const data = await fetchBinanceFollowConfig();
        if (ignore) {
          return;
        }
        setForm({
          enabled: Boolean(data.enabled),
          walletAddress: data.walletAddress || '',
          mode: data.mode || 'fixed',
          amount: data.amount != null ? String(data.amount) : '',
          stopLossAmount: data.stopLossAmount != null ? String(data.stopLossAmount) : '',
          maxPosition: data.maxPosition != null ? String(data.maxPosition) : '',
          minOrderSize: data.minOrderSize != null ? String(data.minOrderSize) : '',
          apiKey: '',
          apiSecret: '',
        });
        setHasApiKey(Boolean(data.hasApiKey));
        setHasApiSecret(Boolean(data.hasApiSecret));
        // 如果用户启用了但状态是 disabled，显示为 enabled_but_disabled
        let status = data.status || (data.enabled ? 'active' : 'disabled');
        if (data.enabled && status === 'disabled') {
          status = 'enabled_but_disabled';
        }
        setFollowStatus(status);
        setStopReason(data.stopReason || '');
        setBaselineBalance(
          typeof data.baselineBalance === 'number' ? data.baselineBalance : null,
        );
      } catch (err) {
        if (!ignore) {
          console.error('Failed to load Binance config:', err);
          setStatusMessage(err.message || (isEnglish ? 'Failed to load Binance settings.' : '无法加载 Binance 设置。'));
          // 如果加载失败，设置默认状态
          setFollowStatus('disabled');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, []); // 只在组件挂载时加载一次

  const statusLabel = useMemo(() => {
    const pack = STATUS_LABELS[followStatus] || STATUS_LABELS.disabled;
    return isEnglish ? pack.en : pack.zh;
  }, [followStatus, isEnglish]);

  const handleChange = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
    if (field === 'apiKey' || field === 'apiSecret') {
      setResetCredentials(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatusMessage('');
    setLoading(true);
    try {
      const payload = {
        enabled: Boolean(form.enabled),
        walletAddress: form.walletAddress.trim() || null,
        mode: form.mode || 'fixed',
        amount: Number(form.amount) || 0,
        stopLossAmount: Number(form.stopLossAmount) || 0,
        maxPosition: Number(form.maxPosition) || 0,
        minOrderSize: Number(form.minOrderSize) || 0,
        apiKey: form.apiKey.trim() || null,
        apiSecret: form.apiSecret.trim() || null,
        resetCredentials,
      };
      const record = await saveBinanceFollowConfig(payload);
      setHasApiKey(Boolean(record.hasApiKey));
      setHasApiSecret(Boolean(record.hasApiSecret));
      // 如果用户启用了但状态是 disabled，显示为 enabled_but_disabled
      let status = record.status || (record.enabled ? 'active' : 'disabled');
      if (record.enabled && status === 'disabled') {
        status = 'enabled_but_disabled';
      }
      setFollowStatus(status);
      setStopReason(record.stopReason || '');
      setBaselineBalance(
        typeof record.baselineBalance === 'number' ? record.baselineBalance : null,
      );
      setForm((prev) => ({
        ...prev,
        enabled: Boolean(record.enabled),
        walletAddress: record.walletAddress || '',
        mode: record.mode || 'fixed',
        amount: record.amount != null ? String(record.amount) : '',
        stopLossAmount: record.stopLossAmount != null ? String(record.stopLossAmount) : '',
        maxPosition: record.maxPosition != null ? String(record.maxPosition) : '',
        minOrderSize: record.minOrderSize != null ? String(record.minOrderSize) : '',
        apiKey: '',
        apiSecret: '',
      }));
      setResetCredentials(false);
      setStatusMessage(isEnglish ? 'Binance settings saved.' : 'Binance 设置已保存。');
    } catch (err) {
      setStatusMessage(err.message || (isEnglish ? 'Save failed, please retry later.' : '保存失败，请稍后重试。'));
    } finally {
      setLoading(false);
    }
  };

  const handleResetCredentials = () => {
    setForm((prev) => ({
      ...prev,
      apiKey: '',
      apiSecret: '',
    }));
    setResetCredentials(true);
    setHasApiKey(false);
    setHasApiSecret(false);
    setStatusMessage(
      isEnglish
        ? 'Credentials will be cleared after saving.'
        : '保存后将清除已保存的 API 凭证。',
    );
  };

  return (
    <section className="dashboard__section binance-follow">
      <div className="monitor-config__header">
        <div>
          <h2>{isEnglish ? 'Binance Auto Follow' : 'Binance 自动跟单'}</h2>
          <p>
            {isEnglish
              ? 'Follow your Hyperliquid wallet trades on Binance USDT-M futures with matched leverage.'
              : '使用与 Hyperliquid 相同的杠杆，在 Binance U 本位合约自动复制交易。'}
          </p>
        </div>
        {statusMessage ? <div className="monitor-config__status">{statusMessage}</div> : null}
      </div>

      <div className="binance-follow__status">
        <span className={`binance-follow__badge binance-follow__badge--${followStatus}`}>
          {statusLabel}
        </span>
        {stopReason ? (
          <span className="binance-follow__status-text">
            {isEnglish ? 'Reason:' : '原因：'}
            {stopReason}
          </span>
        ) : null}
        {baselineBalance != null ? (
          <span className="binance-follow__status-text">
            {isEnglish ? 'Baseline balance:' : '基准余额：'}
            {baselineBalance.toFixed(2)}
            {' '}
            USDT
          </span>
        ) : null}
      </div>

      {!canEdit ? (
        <div className="monitor-config__helper" style={{ padding: 'var(--space-lg)', textAlign: 'center' }}>
          {isEnglish
            ? 'Subscription or trial required to access Binance auto follow. Please subscribe to continue.'
            : '需要订阅或试用期才能使用 Binance 自动跟单功能。请订阅后继续使用。'}
        </div>
      ) : (
        <form className="monitor-config__form" onSubmit={handleSubmit}>
          <div className="monitor-config__fieldset">
            <span className="monitor-config__legend">{isEnglish ? 'Binance Account' : 'Binance 账户'}</span>
            <label className="monitor-config__field monitor-config__field--inline">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={handleChange('enabled')}
                disabled={!canEdit || loading}
            />
            <span>{isEnglish ? 'Enable auto follow' : '启用自动跟单'}</span>
            <small style={{ display: 'block', marginTop: '4px', color: '#888' }}>
              {isEnglish 
                ? 'Uncheck and save to stop auto follow. Configuration persists after leaving this page.'
                : '取消勾选并保存即可停止自动跟单。离开此页面后配置仍然有效。'}
            </small>
          </label>

          <label className="monitor-config__field">
            <span>{isEnglish ? 'Hyperliquid wallet to follow' : '跟随的 Hyperliquid 钱包地址'}</span>
            <input
              type="text"
              value={form.walletAddress}
              onChange={handleChange('walletAddress')}
              placeholder="0x..."
              disabled={!canEdit || loading}
            />
            <small>
              {isEnglish
                ? 'Trades from this wallet will be mirrored on Binance using the selected size mode.'
                : '来自该地址的交易将按所选模式复制到 Binance。'}
            </small>
          </label>

          <div className="monitor-config__input-row">
            <label className="monitor-config__field">
              <div className="monitor-config__field-header">
                <span>{isEnglish ? 'API Key' : 'API Key'}</span>
                <button
                  type="button"
                  className="monitor-config__help-button"
                  onClick={() => {
                    const guideContent = isEnglish
                      ? `Binance API Key Setup Guide:

1. Log in to your Binance account and navigate to API Management.

2. Click "Create API" and select "System generated" for API Key type.

3. Label your API key (e.g., "Hyperliquid Auto Follow") and complete the security verification.

4. IMPORTANT: Only enable "Enable Futures" permission. DO NOT enable "Enable Withdrawals" for security.

5. Copy the API Key and paste it into the "API Key" field above.`
                      : `Binance API Key 配置指南：

1. 登录您的 Binance 账户，进入 API 管理页面。

2. 点击「创建 API」，选择「系统生成」作为 API Key 类型。

3. 为 API Key 命名（例如「Hyperliquid 自动跟单」）并完成安全验证。

4. 重要：仅启用「启用期货」权限。为了安全，请勿启用「启用提现」权限。

5. 复制 API Key 并粘贴到上方的「API Key」输入框中。`;
                    
                    const images = [
                      'https://raw.githubusercontent.com/barron-paw/frontend/main/b1.png',
                      'https://raw.githubusercontent.com/barron-paw/frontend/main/b2.png',
                      'https://raw.githubusercontent.com/barron-paw/frontend/main/b3.png',
                      'https://raw.githubusercontent.com/barron-paw/frontend/main/b4.png',
                      'https://raw.githubusercontent.com/barron-paw/frontend/main/b5.png',
                    ];
                    
                    const imageHtml = images.map((img, idx) => 
                      `<div style="margin: 10px 0;"><img src="${img}" alt="Step ${idx + 1}" style="max-width: 100%; border-radius: 4px;" /></div>`
                    ).join('');
                    
                    const fullContent = `
                      <div style="max-width: 600px; padding: 20px;">
                        <h3 style="margin-top: 0;">${isEnglish ? 'Binance API Key Setup Guide' : 'Binance API Key 配置指南'}</h3>
                        <div style="white-space: pre-line; margin-bottom: 20px;">${guideContent}</div>
                        <div style="margin-top: 20px;">
                          ${imageHtml}
                        </div>
                      </div>
                    `;
                    
                    const modal = document.createElement('div');
                    modal.style.cssText = `
                      position: fixed;
                      top: 0;
                      left: 0;
                      right: 0;
                      bottom: 0;
                      background: rgba(0, 0, 0, 0.7);
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      z-index: 10000;
                      padding: 20px;
                      overflow-y: auto;
                    `;
                    
                    const content = document.createElement('div');
                    content.style.cssText = `
                      background: var(--bg-primary, #1a1a1a);
                      border-radius: 8px;
                      padding: 20px;
                      max-width: 700px;
                      max-height: 90vh;
                      overflow-y: auto;
                      position: relative;
                      color: var(--text-primary, #fff);
                    `;
                    content.innerHTML = fullContent;
                    
                    const closeBtn = document.createElement('button');
                    closeBtn.textContent = '×';
                    closeBtn.style.cssText = `
                      position: absolute;
                      top: 10px;
                      right: 10px;
                      background: none;
                      border: none;
                      color: var(--text-primary, #fff);
                      font-size: 24px;
                      cursor: pointer;
                      width: 30px;
                      height: 30px;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      border-radius: 4px;
                    `;
                    closeBtn.onmouseenter = () => closeBtn.style.background = 'rgba(255, 255, 255, 0.1)';
                    closeBtn.onmouseleave = () => closeBtn.style.background = 'none';
                    closeBtn.onclick = () => document.body.removeChild(modal);
                    
                    content.appendChild(closeBtn);
                    modal.appendChild(content);
                    modal.onclick = (e) => {
                      if (e.target === modal) document.body.removeChild(modal);
                    };
                    document.body.appendChild(modal);
                  }}
                  title={isEnglish ? 'Binance API Key setup guide' : 'Binance API Key 配置指南'}
                >
                  ?
                </button>
              </div>
              <input
                type="text"
                value={form.apiKey}
                onChange={handleChange('apiKey')}
                placeholder={isEnglish ? (hasApiKey ? 'Already stored' : 'Paste Binance API Key') : hasApiKey ? '已保存' : '粘贴 Binance API Key'}
                disabled={!canEdit || loading}
                autoComplete="off"
              />
              {hasApiKey ? (
                <small>{isEnglish ? 'A key is stored on the server.' : '服务器已保存一份 API Key。'}</small>
              ) : null}
            </label>

            <label className="monitor-config__field">
              <div className="monitor-config__field-header">
                <span>{isEnglish ? 'API Secret' : 'API Secret'}</span>
                <button
                  type="button"
                  className="monitor-config__help-button"
                  onClick={() => {
                    const guideContent = isEnglish
                      ? `Binance API Secret Setup Guide:

1. After creating the API Key, Binance will display the API Secret.

2. IMPORTANT: Copy the API Secret immediately. It will only be shown once and cannot be retrieved later.

3. If you lose the API Secret, you will need to delete the API Key and create a new one.

4. Paste the API Secret into the "API Secret" field above.

5. The API Secret will be encrypted and stored securely on the server.`
                      : `Binance API Secret 配置指南：

1. 创建 API Key 后，Binance 会显示 API Secret。

2. 重要：请立即复制 API Secret。它只会显示一次，之后无法再次查看。

3. 如果您丢失了 API Secret，需要删除 API Key 并重新创建。

4. 将 API Secret 粘贴到上方的「API Secret」输入框中。

5. API Secret 将被加密并安全存储在服务器上。`;
                    
                    const images = [
                      'https://raw.githubusercontent.com/barron-paw/frontend/main/b1.png',
                      'https://raw.githubusercontent.com/barron-paw/frontend/main/b2.png',
                      'https://raw.githubusercontent.com/barron-paw/frontend/main/b3.png',
                      'https://raw.githubusercontent.com/barron-paw/frontend/main/b4.png',
                      'https://raw.githubusercontent.com/barron-paw/frontend/main/b5.png',
                    ];
                    
                    const imageHtml = images.map((img, idx) => 
                      `<div style="margin: 10px 0;"><img src="${img}" alt="Step ${idx + 1}" style="max-width: 100%; border-radius: 4px;" /></div>`
                    ).join('');
                    
                    const fullContent = `
                      <div style="max-width: 600px; padding: 20px;">
                        <h3 style="margin-top: 0;">${isEnglish ? 'Binance API Secret Setup Guide' : 'Binance API Secret 配置指南'}</h3>
                        <div style="white-space: pre-line; margin-bottom: 20px;">${guideContent}</div>
                        <div style="margin-top: 20px;">
                          ${imageHtml}
                        </div>
                      </div>
                    `;
                    
                    const modal = document.createElement('div');
                    modal.style.cssText = `
                      position: fixed;
                      top: 0;
                      left: 0;
                      right: 0;
                      bottom: 0;
                      background: rgba(0, 0, 0, 0.7);
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      z-index: 10000;
                      padding: 20px;
                      overflow-y: auto;
                    `;
                    
                    const content = document.createElement('div');
                    content.style.cssText = `
                      background: var(--bg-primary, #1a1a1a);
                      border-radius: 8px;
                      padding: 20px;
                      max-width: 700px;
                      max-height: 90vh;
                      overflow-y: auto;
                      position: relative;
                      color: var(--text-primary, #fff);
                    `;
                    content.innerHTML = fullContent;
                    
                    const closeBtn = document.createElement('button');
                    closeBtn.textContent = '×';
                    closeBtn.style.cssText = `
                      position: absolute;
                      top: 10px;
                      right: 10px;
                      background: none;
                      border: none;
                      color: var(--text-primary, #fff);
                      font-size: 24px;
                      cursor: pointer;
                      width: 30px;
                      height: 30px;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      border-radius: 4px;
                    `;
                    closeBtn.onmouseenter = () => closeBtn.style.background = 'rgba(255, 255, 255, 0.1)';
                    closeBtn.onmouseleave = () => closeBtn.style.background = 'none';
                    closeBtn.onclick = () => document.body.removeChild(modal);
                    
                    content.appendChild(closeBtn);
                    modal.appendChild(content);
                    modal.onclick = (e) => {
                      if (e.target === modal) document.body.removeChild(modal);
                    };
                    document.body.appendChild(modal);
                  }}
                  title={isEnglish ? 'Binance API Secret setup guide' : 'Binance API Secret 配置指南'}
                >
                  ?
                </button>
              </div>
              <input
                type="password"
                value={form.apiSecret}
                onChange={handleChange('apiSecret')}
                placeholder={isEnglish ? (hasApiSecret ? 'Already stored' : 'Paste Binance API Secret') : hasApiSecret ? '已保存' : '粘贴 Binance API Secret'}
                disabled={!canEdit || loading}
                autoComplete="off"
              />
              {hasApiSecret ? (
                <small>
                  {isEnglish ? 'A secret is stored on the server.' : '服务器已保存一份 API Secret。'}
                </small>
              ) : null}
            </label>
          </div>

          {(hasApiKey || hasApiSecret) ? (
            <button
              type="button"
              className="binance-follow__reset"
              onClick={handleResetCredentials}
              disabled={!canEdit || loading}
            >
              {isEnglish ? 'Reset saved credentials' : '重置已保存的凭证'}
            </button>
          ) : null}
        </div>

        <div className="monitor-config__fieldset">
          <span className="monitor-config__legend">{isEnglish ? 'Order size & risk' : '下单与风控'}</span>

          <div className="monitor-config__input-row">
            <label className="monitor-config__field">
              <span>{isEnglish ? 'Size mode' : '份额模式'}</span>
              <select value={form.mode} onChange={handleChange('mode')} disabled={loading}>
                {MODE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {isEnglish ? option.labelEn : option.labelZh}
                  </option>
                ))}
              </select>
            </label>

            <label className="monitor-config__field">
              <span>
                {form.mode === 'percentage'
                  ? (isEnglish ? 'Percentage (%)' : '百分比 (%)')
                  : (isEnglish ? 'Fixed size (USDT)' : '固定份额（USDT）')}
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.amount}
                onChange={handleChange('amount')}
                disabled={!canEdit || loading}
              />
            </label>
          </div>

          <div className="monitor-config__input-row">
            <label className="monitor-config__field">
              <span>{isEnglish ? 'Stop-loss threshold (USDT)' : '止损金额阈值 (USDT)'}</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.stopLossAmount}
                onChange={handleChange('stopLossAmount')}
                disabled={!canEdit || loading}
              />
              <small>
                {isEnglish
                  ? 'When cumulative loss exceeds this amount the bot will stop automatically.'
                  : '当累计亏损超过此金额时自动停止跟单。'}
              </small>
            </label>

            <label className="monitor-config__field">
              <span>{isEnglish ? 'Maximum position (USDT)' : '最大持仓（USDT）'}</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.maxPosition}
                onChange={handleChange('maxPosition')}
                disabled={!canEdit || loading}
              />
            </label>
          </div>

          <label className="monitor-config__field">
            <span>{isEnglish ? 'Minimum order size (USDT)' : '最小下单量（USDT）'}</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.minOrderSize}
              onChange={handleChange('minOrderSize')}
              disabled={!canEdit || loading}
            />
            <small>
              {isEnglish
                ? 'Orders smaller than this value (in USDT) will be skipped to avoid Binance minimum lot errors.'
                : '订单金额（USDT）低于该值时将被跳过，以避免 Binance 最小下单量限制。'}
            </small>
          </label>
        </div>

        <div className="monitor-config__actions">
          <button type="submit" disabled={!canEdit || loading}>
            {loading ? (isEnglish ? 'Processing…' : '处理中…') : isEnglish ? 'Save' : '保存配置'}
          </button>
          <p className="monitor-config__hint">
            {isEnglish
              ? 'Use trade-only API keys. Withdraw permission must remain disabled.'
              : '请使用仅开放交易权限的 API Key，禁止开启提现权限。'}
          </p>
        </div>
      </form>
      )}
    </section>
  );
}

