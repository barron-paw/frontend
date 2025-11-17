import { useMemo, useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { verifySubscription, getSubscriptionPrice } from '../api/subscription.js';
import { useLanguage } from '../context/LanguageContext.jsx';
import { copyToClipboard as copyText } from '../utils/clipboard.js';

const PAYMENT_ADDRESS = '0xc00f356d7d7977ac9ef6399d4bb2da26da139190';

function formatRemaining(user, language) {
  const isEnglish = language === 'en';
  if (!user) {
    return '';
  }
  const now = new Date();
  if (user.subscription_active && user.subscription_end) {
    const end = new Date(user.subscription_end);
    const days = Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
    return isEnglish ? `Subscription active, ~${days} days remaining` : `订阅有效，剩余约 ${days} 天`;
  }
  if (user.trial_active && user.trial_end) {
    const end = new Date(user.trial_end);
    const days = Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
    return isEnglish ? `Trial active, ~${days} days remaining` : `试用期剩余约 ${days} 天`;
  }
  return isEnglish ? 'Trial expired. Please subscribe to continue.' : '试用期已结束，请充值后继续使用监控配置';
}

export default function SubscriptionPanel() {
  const { user, refreshUser } = useAuth();
  const { language } = useLanguage();
  const isEnglish = language === 'en';
  const [txHash, setTxHash] = useState('');
  const [status, setStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [priceInfo, setPriceInfo] = useState(null);

  const remaining = useMemo(() => formatRemaining(user, language), [user, language]);

  // 获取订阅价格信息
  useEffect(() => {
    getSubscriptionPrice()
      .then((response) => {
        setPriceInfo(response.data);
      })
      .catch((err) => {
        console.error('Failed to fetch subscription price:', err);
        // 使用默认值
        setPriceInfo({
          price_usdt: 19.9,
          is_early_bird: false,
          is_first_subscription: true,
          early_bird_price_usdt: 9.9,
          regular_price_usdt: 19.9,
        });
      });
  }, [user]);

  const copyToClipboard = async () => {
    const success = await copyText(PAYMENT_ADDRESS);
    if (success) {
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    } else {
      // 如果复制失败，可以显示错误提示
      console.error('Failed to copy address');
    }
  };

  if (!user) {
    return (
      <section className="dashboard__section">
        <h2>{isEnglish ? 'Membership Subscription' : '会员订阅'}</h2>
        <p>
          {isEnglish
            ? 'Please log in or register first. A 3-day free trial will be granted automatically.'
            : '请先登录或注册账号，系统将自动赠送 3 天试用期。'}
        </p>
      </section>
    );
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!txHash.trim()) {
      setStatus(isEnglish ? 'Please enter a valid transaction hash.' : '请输入有效的交易哈希');
      return;
    }
    try {
      setSubmitting(true);
      setStatus(isEnglish ? 'Verifying transaction on-chain…' : '正在验证链上交易，请稍候…');
      await verifySubscription(txHash.trim());
      await refreshUser();
      // 刷新价格信息（因为用户状态已改变）
      const priceResponse = await getSubscriptionPrice();
      setPriceInfo(priceResponse.data);
      setStatus(isEnglish ? 'Payment confirmed. Subscription activated!' : '支付已确认，订阅已激活！');
      setTxHash('');
    } catch (err) {
      setStatus(err.message || (isEnglish ? 'Verification failed. Please confirm the hash.' : '验证失败，请确认哈希是否正确。'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="dashboard__section subscription-panel">
      <div className="subscription-panel__content">
        <div>
          <h2>{isEnglish ? 'Membership Subscription' : '会员订阅'}</h2>
          <p className="subscription-panel__status">{remaining}</p>
          <ul className="subscription-panel__list">
            <li>
              {isEnglish ? 'Price: ' : '费用：'}
              {priceInfo ? (
                <>
                  <span style={{ fontSize: '1.2em', fontWeight: 'bold', color: priceInfo.is_early_bird ? '#4caf50' : 'inherit' }}>
                    {priceInfo.price_usdt} USDT
                  </span>
                  {priceInfo.is_early_bird && (
                    <span style={{ marginLeft: '8px', color: '#4caf50', fontSize: '0.9em' }}>
                      {isEnglish ? '(Early Bird Price)' : '（早鸟优惠价）'}
                    </span>
                  )}
                  {priceInfo.is_first_subscription && !priceInfo.is_early_bird && priceInfo.early_bird_price_usdt && (
                    <span style={{ marginLeft: '8px', color: '#888', fontSize: '0.9em', textDecoration: 'line-through' }}>
                      {priceInfo.early_bird_price_usdt} USDT
                    </span>
                  )}
                </>
              ) : (
                <span>19.9 USDT</span>
              )}
              {priceInfo?.is_early_bird && (
                <div style={{ marginTop: '4px', fontSize: '0.85em', color: '#4caf50' }}>
                  {isEnglish
                    ? `Regular price: ${priceInfo.regular_price_usdt} USDT/month (after first subscription)`
                    : `标准价格：${priceInfo.regular_price_usdt} USDT/月（首次订阅后）`}
                </div>
              )}
            </li>
            <li>
              {isEnglish ? 'Recipient address (BSC):' : '收款地址（BSC）：'}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <code>{PAYMENT_ADDRESS}</code>
                <button
                  type="button"
                  onClick={copyToClipboard}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-secondary, #999)',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'color 0.2s',
                    borderRadius: '4px',
                  }}
                  title={isEnglish ? 'Click to copy' : '点击复制'}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--primary-color, #3b82f6)';
                    e.currentTarget.style.backgroundColor = 'var(--bg-hover, rgba(255, 255, 255, 0.05))';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--text-secondary, #999)';
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  {copiedAddress ? (
                    <span style={{ color: '#4caf50' }}>✓</span>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                  )}
                </button>
              </div>
            </li>
            <li>
              {isEnglish
                ? 'After completing the payment, submit the transaction hash to extend your subscription.'
                : '完成支付后提交交易哈希，系统会自动延长订阅有效期。'}
            </li>
          </ul>
          <p className="subscription-panel__notice">
            {isEnglish
              ? `Note: the payment amount must be ≥ ${priceInfo?.price_usdt || 19.9} USDT, otherwise the subscription may fail.`
              : `注意：支付金额必须 ≥ ${priceInfo?.price_usdt || 19.9} USDT，否则可能会订阅失败。`}
          </p>
        </div>
        <form className="subscription-panel__form" onSubmit={handleSubmit}>
          <label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span>{isEnglish ? 'Transaction Hash (Tx Hash)' : '交易哈希 (Tx Hash)'}</span>
              <button
                type="button"
                className="monitor-config__help-button"
                onClick={() => {
                  const currentPrice = priceInfo?.price_usdt || 19.9;
                  const guideContent = isEnglish
                    ? `Transaction Hash (Tx Hash) Guide:

Step 1: After completing the payment to the recipient address, you will receive a transaction hash (Tx Hash) from your wallet or exchange.

Step 2: The transaction hash is a unique identifier for your payment transaction on the blockchain. It typically starts with "0x" followed by a long string of letters and numbers (64 characters in hexadecimal format).

Step 3: You can find the transaction hash in several places:
   - In your wallet app (MetaMask, Trust Wallet, etc.) after sending the transaction
   - On the blockchain explorer (BSCScan) by searching for your wallet address
   - In the transaction history of the exchange or wallet you used

Step 4: Copy the complete transaction hash. Make sure to copy the entire string from "0x" to the end, without any spaces or extra characters.

Step 5: Paste the transaction hash into the "Transaction Hash (Tx Hash)" field above and click "Submit" to verify your payment and activate your subscription.

Important Notes:
- The payment amount must be ≥ ${currentPrice} USDT, otherwise the subscription verification may fail.
- The transaction must be sent to the correct recipient address shown above.
- The transaction hash is case-sensitive, so make sure to copy it exactly as shown.`
                    : `交易哈希 (Tx Hash) 指南：

步骤 1：完成向收款地址的支付后，您会从钱包或交易所收到一个交易哈希（Tx Hash）。

步骤 2：交易哈希是您在区块链上支付交易的唯一标识符。它通常以 "0x" 开头，后面跟着一长串字母和数字（十六进制格式，共 64 个字符）。

步骤 3：您可以在以下几个地方找到交易哈希：
   - 在您的钱包应用（MetaMask、Trust Wallet 等）中发送交易后
   - 在区块链浏览器（BSCScan）上通过搜索您的钱包地址
   - 在您使用的交易所或钱包的交易历史记录中

步骤 4：复制完整的交易哈希。确保复制从 "0x" 到结尾的整个字符串，不要有任何空格或额外字符。

步骤 5：将交易哈希粘贴到上方的「交易哈希 (Tx Hash)」输入框中，然后点击「提交验证」来验证您的支付并激活订阅。

重要提示：
- 支付金额必须 ≥ ${currentPrice} USDT，否则订阅验证可能会失败。
- 交易必须发送到上方显示的正确收款地址。
- 交易哈希区分大小写，因此请确保完全按照显示的方式复制。`;

                  const imageUrl = 'https://raw.githubusercontent.com/barron-paw/frontend/main/tx%20hash.png';
                  
                  const fullContent = `
                    <div style="max-width: 700px; padding: 20px;">
                      <h3 style="margin-top: 0; margin-bottom: 20px; font-size: 1.5rem;">${isEnglish ? 'Transaction Hash (Tx Hash) Guide' : '交易哈希 (Tx Hash) 指南'}</h3>
                      <div style="white-space: pre-line; margin-bottom: 30px; line-height: 1.8; font-size: 0.95rem;">${guideContent}</div>
                      <div style="margin-top: 30px; border-top: 1px solid rgba(255, 255, 255, 0.1); padding-top: 20px;">
                        <h4 style="margin-top: 0; margin-bottom: 20px; font-size: 1.2rem; color: var(--text-primary, #fff);">${isEnglish ? 'Screenshot Example' : '截图示例'}</h4>
                        <div style="margin: 20px 0;">
                          <img src="${imageUrl}" alt="${isEnglish ? 'Transaction Hash Example' : '交易哈希示例'}" style="max-width: 100%; border-radius: 6px; border: 1px solid rgba(255, 255, 255, 0.15); box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);" />
                        </div>
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
                title={isEnglish ? 'Transaction Hash guide' : '交易哈希指南'}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary, #999)',
                  cursor: 'pointer',
                  padding: '2px 6px',
                  fontSize: '0.9rem',
                  borderRadius: '50%',
                  width: '20px',
                  height: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--primary-color, #3b82f6)';
                  e.currentTarget.style.backgroundColor = 'var(--bg-hover, rgba(255, 255, 255, 0.05))';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--text-secondary, #999)';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                ?
              </button>
            </div>
            <input
              type="text"
              value={txHash}
              onChange={(event) => setTxHash(event.target.value)}
              placeholder={isEnglish ? '0x...' : '0x...'}
              required
            />
          </label>
          <button type="submit" disabled={submitting}>
            {submitting ? (isEnglish ? 'Verifying…' : '验证中…') : isEnglish ? 'Submit' : '提交验证'}
          </button>
          {status ? <p className="subscription-panel__message">{status}</p> : null}
        </form>
      </div>
    </section>
  );
}
