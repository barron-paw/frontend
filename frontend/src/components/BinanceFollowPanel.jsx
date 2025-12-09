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
    // 只有在有监控权限时才加载 Binance 配置
    if (!canEdit) {
      return;
    }
    let ignore = false;
    const load = async () => {
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
    // 当用户权限状态变化（例如登录完成、订阅生效）时也重新加载一次
  }, [canEdit, isEnglish]);

  const statusLabel = useMemo(() => {
    const pack = STATUS_LABELS[followStatus] || STATUS_LABELS.disabled;
    return isEnglish ? pack.en : pack.zh;
  }, [followStatus, isEnglish]);

  const handleChange = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    
    // 如果输入框显示占位符文本，用户输入时应该清除占位符
    if ((field === 'apiKey' || field === 'apiSecret') && value) {
      const placeholderKey = isEnglish ? '******** (saved)' : '********（已保存）';
      if (value === placeholderKey) {
        // 用户开始输入，清除占位符
        setForm((prev) => ({
          ...prev,
          [field]: '',
        }));
        return;
      }
    }
    
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
    
    // 验证最小下单量
    const minOrderSize = Number(form.minOrderSize) || 0;
    const amount = Number(form.amount) || 0;
    
    if (minOrderSize > 0 && amount > 0) {
      if (form.mode === 'fixed') {
        // 固定模式：最小下单量不能大于固定金额
        if (minOrderSize > amount) {
          setStatusMessage(
            isEnglish
              ? `Error: Minimum order size (${minOrderSize} USDT) cannot be greater than fixed amount (${amount} USDT). All orders will be skipped if this setting is saved.`
              : `错误：最小下单量（${minOrderSize} USDT）不能大于固定份额（${amount} USDT）。保存此设置后，所有订单都会被跳过。`
          );
          setLoading(false);
          return;
        }
      } else if (form.mode === 'percentage') {
        // 百分比模式：最小下单量不能大于百分比（理论上百分比模式的目标金额是动态的，这里只做提示）
        // 由于百分比模式的目标金额取决于跟单钱包的持仓，无法完全验证
        // 但可以提示用户注意
        if (minOrderSize > 0 && amount > 0) {
          // 这里可以添加一个警告，但不阻止保存
          // 因为百分比模式的实际下单金额是动态的
        }
      }
    }
    
    setLoading(true);
    try {
      // 获取实际的输入值（如果输入框被禁用显示占位符，form.apiKey 可能是空字符串）
      // 需要检查输入框的实际值，而不是 form 状态
      let actualApiKey = form.apiKey;
      let actualApiSecret = form.apiSecret;
      
      // 如果输入框显示占位符（已保存状态），但用户没有点击重置，则 actualApiKey 可能是空字符串
      // 此时应该发送 null（保留现有值）
      // 如果用户输入了新的值，actualApiKey 应该是实际的 API Key
      
      // 检查是否是占位符文本
      const isPlaceholderKey = actualApiKey === '********（已保存）' || actualApiKey === '******** (saved)';
      const isPlaceholderSecret = actualApiSecret === '********（已保存）' || actualApiSecret === '******** (saved)';
      
      // 如果显示占位符且未重置，说明要保留现有值
      if (isPlaceholderKey && !resetCredentials) {
        actualApiKey = null;
      } else if (actualApiKey && actualApiKey.trim()) {
        actualApiKey = actualApiKey.trim();
      } else {
        actualApiKey = null;
      }
      
      if (isPlaceholderSecret && !resetCredentials) {
        actualApiSecret = null;
      } else if (actualApiSecret && actualApiSecret.trim()) {
        actualApiSecret = actualApiSecret.trim();
      } else {
        actualApiSecret = null;
      }
      
      // 检查用户是否输入了新的 API Key/Secret（不是占位符，不是空字符串）
      const hasNewApiKey = actualApiKey !== null && actualApiKey.length > 0;
      const hasNewApiSecret = actualApiSecret !== null && actualApiSecret.length > 0;
      
      console.log('[BinanceFollowPanel] 保存配置:', {
        formApiKey: form.apiKey ? `${form.apiKey.substring(0, 10)}...` : 'empty',
        formApiSecret: form.apiSecret ? `${form.apiSecret.substring(0, 10)}...` : 'empty',
        actualApiKey: actualApiKey ? `${actualApiKey.substring(0, 10)}...` : 'null',
        actualApiSecret: actualApiSecret ? `${actualApiSecret.substring(0, 10)}...` : 'null',
        hasNewApiKey,
        hasNewApiSecret,
        isPlaceholderKey,
        isPlaceholderSecret,
        resetCredentials,
        hasApiKey,
        hasApiSecret,
      });
      
      // 构建 payload，确保 apiKey 和 apiSecret 字段始终存在（即使是 null）
      const payload = {
        enabled: Boolean(form.enabled),
        walletAddress: form.walletAddress.trim() || null,
        mode: form.mode || 'fixed',
        amount: Number(form.amount) || 0,
        stopLossAmount: Number(form.stopLossAmount) || 0,
        maxPosition: Number(form.maxPosition) || 0,
        minOrderSize: Number(form.minOrderSize) || 0,
        resetCredentials,
      };
      
      // 显式添加 apiKey 和 apiSecret，确保它们始终在 payload 中
      // 如果 actualApiKey 是 null，也要包含，让后端知道要保留现有值
      if (actualApiKey !== undefined) {
        payload.apiKey = actualApiKey;
      } else {
        payload.apiKey = null;
      }
      
      if (actualApiSecret !== undefined) {
        payload.apiSecret = actualApiSecret;
      } else {
        payload.apiSecret = null;
      }
      
      // 记录 payload，确保 apiKey 和 apiSecret 字段可见
      const payloadForLog = {
        enabled: payload.enabled,
        walletAddress: payload.walletAddress,
        mode: payload.mode,
        amount: payload.amount,
        stopLossAmount: payload.stopLossAmount,
        maxPosition: payload.maxPosition,
        minOrderSize: payload.minOrderSize,
        resetCredentials: payload.resetCredentials,
        apiKey: payload.apiKey ? `${payload.apiKey.substring(0, 10)}... (length: ${payload.apiKey.length})` : 'null',
        apiSecret: payload.apiSecret ? `${payload.apiSecret.substring(0, 10)}... (length: ${payload.apiSecret.length})` : 'null',
      };
      console.log('[BinanceFollowPanel] 发送的 payload:', payloadForLog);
      console.log('[BinanceFollowPanel] payload 原始对象:', payload);
      console.log('[BinanceFollowPanel] payload.apiKey 存在?', 'apiKey' in payload, '值:', payload.apiKey ? '有值' : 'null/undefined');
      console.log('[BinanceFollowPanel] payload.apiSecret 存在?', 'apiSecret' in payload, '值:', payload.apiSecret ? '有值' : 'null/undefined');
      
      const record = await saveBinanceFollowConfig(payload);
      
      console.log('[BinanceFollowPanel] 保存后的记录:', {
        hasApiKey: record.hasApiKey,
        hasApiSecret: record.hasApiSecret,
        enabled: record.enabled,
        status: record.status,
      });
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
        ? 'Credentials will be cleared after saving. You can now enter new API Key and Secret.'
        : '保存后将清除已保存的 API 凭证。现在可以输入新的 API Key 和 Secret。',
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
            <div style={{ marginTop: '8px', color: '#ff4444', fontSize: '14px', fontWeight: 'bold' }}>
              {isEnglish 
                ? '⚠️ Auto follow requires the wallet to be properly monitored and notifications enabled. Otherwise, auto follow will not work.'
                : '⚠️ 跟单需要该钱包已正确监控并启用通知，否则不会跟单。'}
            </div>
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

Step 1: Log in to your Binance account. After logging in, click on your profile icon in the top-right corner of the page.

Step 2: In the dropdown menu that appears, find and click on "API Management" (API 管理) option. This will take you to the API management page.

Step 3: On the API Management page, you will see a list of your existing API keys (if any) and a "Create API" (创建 API) button. Click on the "Create API" button to start creating a new API key. IMPORTANT: Make sure to uncheck "Silent Security Control Measures" (静默安全控制措施). You must uncheck this option first, otherwise you will not be able to enable futures trading in the later steps.

Step 4: A dialog box will appear asking you to choose the API Key type. Select "System generated" (系统生成) as the API Key type. This is the recommended option for security.

Step 5: You will be prompted to label your API key. Enter a descriptive name such as "Hyperliquid Auto Follow" or "交易跟单" to help you identify this API key later. Then complete the security verification (this may include email verification, SMS verification, or Google Authenticator code depending on your account security settings).

Step 6: IMPORTANT - Permission Settings: On the permission settings page, you will see several permission options. For security reasons, ONLY enable "Futures Trading" (合约交易) permission. DO NOT enable "Enable Withdrawals" (启用提现) or "Enable Reading" (启用读取) permissions. This ensures that even if your API key is compromised, it cannot be used to withdraw funds from your account.

Step 7: After setting the permissions, click "Next" or "Create" to complete the API key creation process. Binance will display your newly created API Key. Copy the entire API Key string immediately.

Step 8: Paste the copied API Key into the "API Key" field in the form above. Make sure to copy the complete key without any extra spaces or characters.`
                      : `Binance API Key 配置指南：

步骤 1：登录您的 Binance 账户。登录后，点击页面右上角的个人头像图标。

步骤 2：在下拉菜单中，找到并点击「API 管理」选项。这将带您进入 API 管理页面。

步骤 3：在 API 管理页面上，您会看到现有 API Key 列表（如果有）和一个「创建 API」按钮。点击「创建 API」按钮开始创建新的 API Key。重要：请务必取消勾选「静默安全控制措施」。您必须先取消勾选此选项，否则在后续步骤中将无法启用合约交易。

步骤 4：将弹出一个对话框，要求您选择 API Key 类型。选择「系统生成」作为 API Key 类型。这是推荐的安全选项。

步骤 5：系统会提示您为 API Key 命名。输入一个描述性的名称，例如「Hyperliquid 自动跟单」或「交易跟单」，以便您以后识别此 API Key。然后完成安全验证（这可能包括邮箱验证、短信验证或 Google 验证器代码，具体取决于您的账户安全设置）。

步骤 6：重要 - 权限设置：在权限设置页面上，您会看到多个权限选项。为了安全起见，仅启用「合约交易」权限。请勿启用「启用提现」或「启用读取」权限。这确保即使您的 API Key 被泄露，也无法用于从您的账户提取资金。

步骤 7：设置权限后，点击「下一步」或「创建」以完成 API Key 创建过程。Binance 将显示您新创建的 API Key。请立即复制整个 API Key 字符串。

步骤 8：将复制的 API Key 粘贴到上方表单中的「API Key」输入框中。确保复制完整的密钥，不要有多余的空格或字符。`;
                    
                    const images = [
                      'https://raw.githubusercontent.com/barron-paw/frontend/main/b1.png',
                      'https://raw.githubusercontent.com/barron-paw/frontend/main/b2.png',
                      'https://raw.githubusercontent.com/barron-paw/frontend/main/b3.png',
                      'https://raw.githubusercontent.com/barron-paw/frontend/main/b4.png',
                      'https://raw.githubusercontent.com/barron-paw/frontend/main/b5.png',
                    ];
                    
                    const imageHtml = images.map((img, idx) => 
                      `<div style="margin: 20px 0;">
                        <div style="font-weight: 600; margin-bottom: 10px; color: var(--text-primary, #fff); font-size: 1.1rem; padding-bottom: 8px; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
                          ${isEnglish ? `Step ${idx + 1}` : `步骤 ${idx + 1}`}
                        </div>
                        <img src="${img}" alt="${isEnglish ? `Step ${idx + 1}` : `步骤 ${idx + 1}`}" style="max-width: 100%; border-radius: 6px; border: 1px solid rgba(255, 255, 255, 0.15); box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);" />
                      </div>`
                    ).join('');
                    
                    const fullContent = `
                      <div style="max-width: 700px; padding: 20px;">
                        <h3 style="margin-top: 0; margin-bottom: 20px; font-size: 1.5rem;">${isEnglish ? 'Binance API Key Setup Guide' : 'Binance API Key 配置指南'}</h3>
                        <div style="white-space: pre-line; margin-bottom: 30px; line-height: 1.8; font-size: 0.95rem;">${guideContent}</div>
                        <div style="margin-top: 30px; border-top: 1px solid rgba(255, 255, 255, 0.1); padding-top: 20px;">
                          <h4 style="margin-top: 0; margin-bottom: 20px; font-size: 1.2rem; color: var(--text-primary, #fff);">${isEnglish ? 'Step-by-Step Screenshots' : '步骤截图'}</h4>
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
                value={
                  hasApiKey && !resetCredentials
                    ? (isEnglish ? '******** (saved)' : '********（已保存）')
                    : form.apiKey
                }
                onChange={handleChange('apiKey')}
                placeholder={
                  isEnglish
                    ? hasApiKey
                      ? '******** (saved)'
                      : 'Paste Binance API Key'
                    : hasApiKey
                      ? '********（已保存）'
                      : '粘贴 Binance API Key'
                }
                disabled={!canEdit || loading || (hasApiKey && !resetCredentials)}
                autoComplete="off"
              />
              {hasApiKey && !resetCredentials ? (
                <small>
                  {isEnglish
                    ? 'API Key is securely stored. Click "Reset saved credentials" below if you want to replace it.'
                    : 'API Key 已安全保存。如需更换，请点击下方“重置已保存的凭证”。'}
                </small>
              ) : hasApiKey ? (
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

Step 1: After successfully creating your API Key and setting the permissions, Binance will display a confirmation page showing both your API Key and API Secret.

Step 2: IMPORTANT - Copy the API Secret immediately: The API Secret is displayed only once during the creation process. It will NOT be shown again after you close this page. Make sure to copy the entire API Secret string before proceeding.

Step 3: Store the API Secret securely: You can temporarily save it in a secure location (like a password manager or encrypted note) while you complete the setup. Never share your API Secret with anyone.

Step 4: If you lose the API Secret: Unfortunately, Binance does not allow you to view the API Secret again after creation. If you lose it, you will need to delete the existing API Key and create a new one from scratch.

Step 5: Paste the API Secret into the "API Secret" field in the form above. Make sure to copy the complete secret without any extra spaces, line breaks, or characters. The API Secret is typically a long string of letters and numbers.

Step 6: Security Note: The API Secret will be encrypted using industry-standard encryption and stored securely on our server. It will never be displayed in plain text after you save it.`
                      : `Binance API Secret 配置指南：

步骤 1：成功创建 API Key 并设置权限后，Binance 会显示一个确认页面，显示您的 API Key 和 API Secret。

步骤 2：重要 - 立即复制 API Secret：API Secret 仅在创建过程中显示一次。关闭此页面后，将无法再次查看。请确保在继续操作之前复制整个 API Secret 字符串。

步骤 3：安全存储 API Secret：您可以在完成设置期间将其临时保存在安全位置（如密码管理器或加密笔记）。切勿与任何人分享您的 API Secret。

步骤 4：如果您丢失了 API Secret：不幸的是，Binance 不允许您在创建后再次查看 API Secret。如果您丢失了它，您需要删除现有的 API Key 并从头开始创建新的 API Key。

步骤 5：将 API Secret 粘贴到上方表单中的「API Secret」输入框中。确保复制完整的密钥，不要有多余的空格、换行符或字符。API Secret 通常是一长串字母和数字。

步骤 6：安全说明：API Secret 将使用行业标准加密进行加密，并安全存储在我们的服务器上。保存后，它永远不会以明文形式显示。`;
                    
                    const images = [
                      'https://raw.githubusercontent.com/barron-paw/frontend/main/b1.png',
                      'https://raw.githubusercontent.com/barron-paw/frontend/main/b2.png',
                      'https://raw.githubusercontent.com/barron-paw/frontend/main/b3.png',
                      'https://raw.githubusercontent.com/barron-paw/frontend/main/b4.png',
                      'https://raw.githubusercontent.com/barron-paw/frontend/main/b5.png',
                    ];
                    
                    const imageHtml = images.map((img, idx) => 
                      `<div style="margin: 20px 0;">
                        <div style="font-weight: 600; margin-bottom: 10px; color: var(--text-primary, #fff); font-size: 1.1rem; padding-bottom: 8px; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
                          ${isEnglish ? `Step ${idx + 1}` : `步骤 ${idx + 1}`}
                        </div>
                        <img src="${img}" alt="${isEnglish ? `Step ${idx + 1}` : `步骤 ${idx + 1}`}" style="max-width: 100%; border-radius: 6px; border: 1px solid rgba(255, 255, 255, 0.15); box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);" />
                      </div>`
                    ).join('');
                    
                    const fullContent = `
                      <div style="max-width: 700px; padding: 20px;">
                        <h3 style="margin-top: 0; margin-bottom: 20px; font-size: 1.5rem;">${isEnglish ? 'Binance API Secret Setup Guide' : 'Binance API Secret 配置指南'}</h3>
                        <div style="white-space: pre-line; margin-bottom: 30px; line-height: 1.8; font-size: 0.95rem;">${guideContent}</div>
                        <div style="margin-top: 30px; border-top: 1px solid rgba(255, 255, 255, 0.1); padding-top: 20px;">
                          <h4 style="margin-top: 0; margin-bottom: 20px; font-size: 1.2rem; color: var(--text-primary, #fff);">${isEnglish ? 'Step-by-Step Screenshots' : '步骤截图'}</h4>
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
                value={
                  hasApiSecret && !resetCredentials
                    ? (isEnglish ? '******** (saved)' : '********（已保存）')
                    : form.apiSecret
                }
                onChange={handleChange('apiSecret')}
                placeholder={
                  isEnglish
                    ? hasApiSecret
                      ? '******** (saved)'
                      : 'Paste Binance API Secret'
                    : hasApiSecret
                      ? '********（已保存）'
                      : '粘贴 Binance API Secret'
                }
                disabled={!canEdit || loading || (hasApiSecret && !resetCredentials)}
                autoComplete="off"
              />
              {hasApiSecret && !resetCredentials ? (
                <small>
                  {isEnglish
                    ? 'API Secret is securely stored. Click "Reset saved credentials" below if you want to replace it.'
                    : 'API Secret 已安全保存。如需更换，请点击下方“重置已保存的凭证”。'}
                </small>
              ) : hasApiSecret ? (
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
              <div className="monitor-config__field-header">
                <span>{isEnglish ? 'Size mode' : '份额模式'}</span>
                <button
                  type="button"
                  className="monitor-config__help-button"
                  onClick={() => {
                    const text = isEnglish
                      ? `Order Size Modes:

• Fixed size (USDT): Every time the followed wallet opens a position, your Binance account uses a fixed USDT amount (converted to contracts at the mark price) to open or close. When the followed wallet fully closes, Binance will fully close your remaining position for that symbol.
• Percentage (%): Your order size is calculated as (followed wallet position size × percentage). When the followed wallet increases or reduces position, your Binance position will increase / reduce by the same percentage. On a full close, Binance will also fully close your current position for that symbol.`
                      : `份额模式说明：

• 固定份额（USDT）：跟单钱包每次开仓时，您的 Binance 账户都会按固定的 USDT 金额下单（按标记价格换算为合约数量）。当跟单钱包完全平仓时，Binance 侧会按您当前实际持仓一次性全部平仓。
• 按百分比（%）：您的下单金额 = 跟单钱包持仓名义金额 × 设置的百分比。跟单钱包加仓 / 减仓时，您的 Binance 仓位会按相同比例增减；当跟单钱包完全平仓时，Binance 侧也会把当前持仓全部平掉。`;
                    alert(text);
                  }}
                  title={isEnglish ? 'Explain size modes' : '解释份额模式'}
                >
                  ?
                </button>
              </div>
              <select value={form.mode} onChange={handleChange('mode')} disabled={loading}>
                {MODE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {isEnglish ? option.labelEn : option.labelZh}
                  </option>
                ))}
              </select>
            </label>

            <label className="monitor-config__field">
              <div className="monitor-config__field-header">
                <span>
                  {form.mode === 'percentage'
                    ? (isEnglish ? 'Percentage (%)' : '百分比 (%)')
                    : (isEnglish ? 'Fixed size (USDT)' : '固定份额（USDT）')}
                </span>
                <button
                  type="button"
                  className="monitor-config__help-button"
                  onClick={() => {
                    const text = isEnglish
                      ? `How this value is used:

• Fixed size (USDT): This is the USDT amount you want to use per followed trade. It will be converted to contracts using the Binance mark price. If the resulting quantity is smaller than Binance’s minimum lot size (for example, 0.001 BTC), the order will be skipped.
• Percentage (%): This is the percentage of the followed wallet’s position size. For example, 50% means your position target is half of the followed wallet’s size; open / reduce / close events will follow this ratio.`
                      : `该数值的含义：

• 固定份额（USDT）：表示每次跟单使用的 USDT 金额，系统会按 Binance 标记价格换算成合约数量。如果换算后的数量小于该合约在 Binance 的最小下单量（例如 BTC 通常是 0.001），该笔订单会被跳过。
• 百分比（%）：表示跟单钱包持仓规模的百分比。例如设置 50%，则目标是对方仓位的一半，开仓 / 减仓 / 平仓都会按这个比例同步。`;
                    alert(text);
                  }}
                  title={isEnglish ? 'Explain amount field' : '解释该数值含义'}
                >
                  ?
                </button>
              </div>
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
              <div className="monitor-config__field-header">
                <span>{isEnglish ? 'Stop-loss threshold (USDT)' : '止损金额阈值 (USDT)'}</span>
                <button
                  type="button"
                  className="monitor-config__help-button"
                  onClick={() => {
                    const text = isEnglish
                      ? `How stop loss is calculated:

• When you enable auto follow, the system records your Binance futures wallet balance as the baseline.
• It then continuously checks: loss = baseline_balance - current_balance.
• If the cumulative loss is greater than or equal to this amount, all Binance positions will be closed and auto follow will stop.

Tip: This only counts the loss after you enabled auto follow. Any profit or loss before that is treated as your starting point.`
                      : `止损金额的计算方式：

• 启用自动跟单时，系统会记录当时 Binance 合约账户的总余额，作为“基准余额”。
• 之后持续检查：亏损 = 基准余额 - 当前余额。
• 当累计亏损大于等于这里填写的金额时，会自动平掉币安所有持仓并停止跟单。

提示：这里只统计“开启自动跟单之后”的亏损，之前的历史盈亏会被当作你的起点。`;
                    alert(text);
                  }}
                  title={isEnglish ? 'Explain stop-loss threshold' : '解释止损金额含义'}
                >
                  ?
                </button>
              </div>
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
              <div className="monitor-config__field-header">
                <span>{isEnglish ? 'Maximum position (USDT)' : '最大持仓（USDT）'}</span>
                <button
                  type="button"
                  className="monitor-config__help-button"
                  onClick={() => {
                    const text = isEnglish
                      ? `Maximum position logic:

• If your current position exceeds the set amount, the system will automatically close positions down to the set amount.
• Before each new follow order, the bot checks your current Binance position size for this symbol (converted to USDT).
• If current_position_value + planned_order_value would exceed this maximum, the new order will be skipped (only reducing/closing is allowed).

Tip: If you turn on auto follow while already holding a position, that existing position is also counted into the maximum.`
                      : `最大持仓配置逻辑：

• 如果当前仓位大于设置金额，会自动平仓至设置金额。
• 每次准备开新单前，系统会先读取你在该合约上的当前仓位，并按当前价格折算成 USDT。
• 如果 当前仓位价值 + 这次计划下单的价值 > 最大持仓，则这笔开仓会被跳过（只允许后续减仓 / 平仓）。

提示：如果你在开启自动跟单之前已经有仓位，这部分仓位也会被一起计入最大持仓的限制中。`;
                    alert(text);
                  }}
                  title={isEnglish ? 'Explain maximum position' : '解释最大持仓含义'}
                >
                  ?
                </button>
              </div>
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
            <div className="monitor-config__field-header">
              <span>{isEnglish ? 'Minimum order size (USDT)' : '最小下单量（USDT）'}</span>
              <button
                type="button"
                className="monitor-config__help-button"
                onClick={() => {
                  const text = isEnglish
                    ? `Minimum order size logic:

• Orders smaller than this value (in USDT) will be skipped to avoid Binance minimum lot errors.
• IMPORTANT: The minimum order size must NOT be greater than:
  - Fixed size mode: The fixed amount you set
  - Percentage mode: Percentage × Target order amount
• If the minimum order size is too large, all orders will be skipped and auto-follow will not work.`
                    : `最小下单量配置逻辑：

• 订单金额（USDT）低于该值时将被跳过，以避免 Binance 最小下单量限制。
• 重要：最小下单量不能大于：
  - 固定份额模式：您设置的固定金额
  - 百分比模式：百分比 × 目标下单金额
• 如果最小下单量设置过大，所有订单都会被跳过，自动跟单将无法完成。`;
                  alert(text);
                }}
                title={isEnglish ? 'Explain minimum order size' : '解释最小下单量含义'}
              >
                ?
              </button>
            </div>
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
          <p className="monitor-config__hint" style={{ color: 'red' }}>
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

