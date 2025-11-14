import { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { verifySubscription } from '../api/subscription.js';
import { useLanguage } from '../context/LanguageContext.jsx';
import { copyToClipboard as copyText } from '../utils/clipboard.js';

const PAYMENT_ADDRESS = '0xc00f356d7d7977ac9ef6399d4bb2da26da139190';
const PAYMENT_AMOUNT_EN = '7.9 USDT monthly';
const PAYMENT_AMOUNT_ZH = '7.9 USDT 月费';

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

  const remaining = useMemo(() => formatRemaining(user, language), [user, language]);

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
            <li>{isEnglish ? `Price: ${PAYMENT_AMOUNT_EN}` : `费用：${PAYMENT_AMOUNT_ZH}`}</li>
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
              ? 'Note: the payment amount must be ≥ 7.9 USDT, otherwise the subscription may fail.'
              : '注意：支付金额必须 ≥ 7.9 USDT，否则可能会订阅失败。'}
          </p>
        </div>
        <form className="subscription-panel__form" onSubmit={handleSubmit}>
          <label>
            {isEnglish ? 'Transaction Hash (Tx Hash)' : '交易哈希 (Tx Hash)'}
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
