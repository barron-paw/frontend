import { useMemo, useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import AuthDialog from './AuthDialog.jsx';
import './AccountMenu.css';
import { useLanguage } from '../context/LanguageContext.jsx';
import { fetchMonitorConfig, updateMonitorConfig } from '../api/config.js';
import { getInvitationStats } from '../api/auth.js';

function formatStatus(user, language) {
  const isEnglish = language === 'en';
  if (!user) {
    return null;
  }
  
  // 调试日志（仅在开发环境）
  if (process.env.NODE_ENV === 'development') {
    console.log('[formatStatus] User data:', {
      subscription_active: user.subscription_active,
      subscription_end: user.subscription_end,
      trial_active: user.trial_active,
      trial_end: user.trial_end,
    });
  }
  
  const trialEnd = user.trial_end ? new Date(user.trial_end) : null;
  const subscriptionEnd = user.subscription_end ? new Date(user.subscription_end) : null;
  const now = new Date();

  // 格式化日期，确保在不同浏览器和时区下都能正确显示
  const formatDate = (date) => {
    if (!date || isNaN(date.getTime())) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[formatDate] Invalid date:', date);
      }
      return '';
    }
    try {
      // 使用UTC时间格式化，避免时区问题
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');
      const hours = String(date.getUTCHours()).padStart(2, '0');
      const minutes = String(date.getUTCMinutes()).padStart(2, '0');
      return `${year}-${month}-${day} ${hours}:${minutes} UTC`;
    } catch (e) {
      console.error('[formatDate] Date formatting error:', e, date);
      return date.toISOString().split('T')[0]; // 降级到简单的日期格式
    }
  };

  if (user.subscription_active && subscriptionEnd && !isNaN(subscriptionEnd.getTime())) {
    const formattedDate = formatDate(subscriptionEnd);
    if (process.env.NODE_ENV === 'development') {
      console.log('[formatStatus] Subscription active, formatted date:', formattedDate);
    }
    return isEnglish
      ? `Subscription active, until ${formattedDate}`
      : `订阅有效，截止 ${formattedDate}`;
  }
  if (user.trial_active && trialEnd && !isNaN(trialEnd.getTime())) {
    const days = Math.max(0, Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24)));
    return isEnglish ? `Trial remaining ${days} days` : `试用剩余 ${days} 天`;
  }
  return isEnglish ? 'Expired. Please renew to continue monitoring.' : '已过期，请续费后继续使用监控功能';
}

export default function AccountMenu() {
  const { user, loading, logout, refreshUser } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState('login');
  const { language, setLanguage } = useLanguage();
  const isEnglish = language === 'en';
  const statusLabel = useMemo(() => formatStatus(user, language), [user, language]);
  const [savingLanguage, setSavingLanguage] = useState(false);
  const [invitationStats, setInvitationStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [showInvitation, setShowInvitation] = useState(false);

  // 定期刷新用户信息（每5分钟），确保订阅信息是最新的
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      refreshUser(true); // 强制刷新，防止缓存
    }, 5 * 60 * 1000); // 5分钟
    return () => clearInterval(interval);
  }, [user, refreshUser]);

  // 当页面变为可见时，立即刷新用户信息（用户切换回标签页时）
  useEffect(() => {
    if (!user) return;
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshUser(true); // 强制刷新，防止缓存
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user, refreshUser]);

  const openDialog = (mode) => {
    setDialogMode(mode);
    setDialogOpen(true);
  };

  useEffect(() => {
    if (user) {
      loadInvitationStats();
    } else {
      setInvitationStats(null);
      setShowInvitation(false);
    }
  }, [user]);

  const loadInvitationStats = async () => {
    if (!user) return;
    try {
      setLoadingStats(true);
      const stats = await getInvitationStats();
      setInvitationStats(stats);
    } catch (err) {
      console.error('Failed to load invitation stats:', err);
      setInvitationStats(null);
    } finally {
      setLoadingStats(false);
    }
  };

  const copyInviteCode = async () => {
    if (!user?.invite_code) return;
    try {
      await navigator.clipboard.writeText(user.invite_code);
      // 可以添加一个提示消息
    } catch (err) {
      console.error('Failed to copy invite code:', err);
    }
  };

  const handleLanguageChange = async (event) => {
    const nextLanguage = event.target.value;
    setLanguage(nextLanguage);
    if (!user) {
      return;
    }
    try {
      setSavingLanguage(true);
      const config = await fetchMonitorConfig().catch(() => null);
      if (!config) {
        return;
      }
      await updateMonitorConfig({
        telegramBotToken: (config.telegramBotToken || '').trim() || null,
        telegramChatId: (config.telegramChatId || '').trim() || null,
        walletAddresses: Array.isArray(config.walletAddresses) ? config.walletAddresses : [],
        language: nextLanguage,
      });
      setLanguage(nextLanguage);
    } catch (error) {
      console.error('Failed to update language preference', error);
    } finally {
      setSavingLanguage(false);
    }
  };

  if (loading) {
    return <div className="account-menu">{isEnglish ? 'Loading account…' : '正在加载账号信息…'}</div>;
  }

  return (
    <div className="account-menu">
      {user ? (
        <>
          <div className="account-menu__details">
            <div className="account-menu__email">{user.email}</div>
            <div className="account-menu__status" data-active={user.can_access_monitor}>{statusLabel}</div>
            {user.invite_code && (
              <div className="account-menu__invitation">
                <button
                  type="button"
                  className="account-menu__invitation-toggle"
                  onClick={() => setShowInvitation(!showInvitation)}
                >
                  {isEnglish ? 'Invitation' : '邀请码'} {showInvitation ? '▼' : '▶'}
                </button>
                {showInvitation && (
                  <div className="account-menu__invitation-details">
                    <div className="account-menu__invitation-code">
                      <span>{isEnglish ? 'My Invite Code:' : '我的邀请码：'}</span>
                      <div className="account-menu__invitation-code-value">
                        <code>{user.invite_code}</code>
                        <button
                          type="button"
                          onClick={copyInviteCode}
                          title={isEnglish ? 'Copy' : '复制'}
                          style={{ marginLeft: '8px', padding: '4px 8px', fontSize: '12px' }}
                        >
                          {isEnglish ? 'Copy' : '复制'}
                        </button>
                      </div>
                    </div>
                    {loadingStats ? (
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        {isEnglish ? 'Loading stats...' : '加载统计中...'}
                      </div>
                    ) : invitationStats ? (
                      <div className="account-menu__invitation-stats">
                        <div>
                          {isEnglish ? 'Total Invitees:' : '总邀请人数：'} <strong>{invitationStats.total_invitees}</strong>
                        </div>
                        <div>
                          {isEnglish ? 'Subscribed Members:' : '订阅会员数：'} <strong>{invitationStats.subscribed_invitees}</strong>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            )}
          </div>
          <button type="button" className="account-menu__button" onClick={logout}>
            {isEnglish ? 'Sign out' : '退出'}
          </button>
        </>
      ) : (
        <div className="account-menu__actions">
          <button type="button" className="account-menu__button" onClick={() => openDialog('login')}>
            {isEnglish ? 'Sign in' : '登录'}
          </button>
          <button type="button" className="account-menu__button account-menu__button--secondary" onClick={() => openDialog('register')}>
            {isEnglish ? 'Register' : '注册'}
          </button>
        </div>
      )}

      <div className="account-menu__language">
        <span aria-hidden="true">🌐</span>
        <label className="visually-hidden" htmlFor="language-select">
          {isEnglish ? 'Language' : '界面语言'}
        </label>
        <select
          id="language-select"
          value={language}
          onChange={handleLanguageChange}
          disabled={savingLanguage}
        >
          <option value="zh">中文</option>
          <option value="en">English</option>
        </select>
      </div>

      <AuthDialog
        open={dialogOpen}
        mode={dialogMode}
        onClose={() => setDialogOpen(false)}
        onSwitch={(mode) => setDialogMode(mode)}
      />
    </div>
  );
}
