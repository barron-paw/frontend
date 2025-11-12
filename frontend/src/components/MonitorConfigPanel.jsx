
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { fetchMonitorConfig, updateMonitorConfig } from '../api/config.js';
import BotFatherGuide from './BotFatherGuide.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';

const GUIDE_EXPANDED_KEY = 'hm_telegram_guide_expanded';
const GUIDE_SEEN_KEY = 'hm_telegram_guide_seen';

export default function MonitorConfigPanel() {
  const { user } = useAuth();
  const { language, setLanguage } = useLanguage();
  const isEnglish = language === 'en';
  const [form, setForm] = useState({
    telegramChatId: '',
    walletAddresses: '',
    language: 'zh',
  });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [usesDefaultBot, setUsesDefaultBot] = useState(false);
  const [defaultBotUsername, setDefaultBotUsername] = useState('');
  const [guideExpanded, setGuideExpanded] = useState(true);

  const canEdit = user?.can_access_monitor;

  useEffect(() => {
    const loadConfig = async () => {
      if (!canEdit) {
        return;
      }
      setLoading(true);
      try {
        const data = await fetchMonitorConfig();
        setForm({
          telegramChatId: data.telegramChatId || '',
          walletAddresses: (data.walletAddresses || []).join('\n'),
          language: data.language || 'zh',
        });
        setLanguage(data.language || 'zh');
        setUsesDefaultBot(Boolean(data.usesDefaultBot));
        setDefaultBotUsername(data.defaultBotUsername || '');
      } catch (err) {
        setStatus(isEnglish ? err.message || 'Failed to load monitor configuration' : err.message || '无法加载监控配置');
      } finally {
        setLoading(false);
      }
    };
    loadConfig();
  }, [canEdit, isEnglish, setLanguage]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const stored = window.localStorage.getItem(GUIDE_EXPANDED_KEY);
    if (stored !== null) {
      setGuideExpanded(stored === 'true');
      return;
    }
    const seen = window.localStorage.getItem(GUIDE_SEEN_KEY);
    if (seen) {
      setGuideExpanded(false);
    } else {
      window.localStorage.setItem(GUIDE_SEEN_KEY, 'true');
      window.localStorage.setItem(GUIDE_EXPANDED_KEY, 'true');
      setGuideExpanded(true);
    }
  }, []);

  const helperText = useMemo(() => {
    if (!user) {
      return isEnglish ? 'Please log in to configure monitoring.' : '请先登录后配置监控信息。';
    }
    if (!canEdit) {
      return isEnglish ? 'Trial expired or subscription inactive. Monitoring configuration locked.' : '试用已到期或订阅未激活，无法编辑监控配置。';
    }
    return '';
  }, [user, canEdit, isEnglish]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canEdit) {
      return;
    }
    setStatus('');
    try {
      setLoading(true);
      const payload = {
        telegramChatId: form.telegramChatId.trim() || null,
        walletAddresses: form.walletAddresses
          .split(/[\s,;]+/)
          .map((addr) => addr.trim())
          .filter(Boolean)
          .slice(0, 2),
        language: form.language,
      };
      const response = await updateMonitorConfig(payload);
      setForm({
        telegramChatId: response.telegramChatId || '',
        walletAddresses: (response.walletAddresses || []).join('\n'),
        language: response.language || 'zh',
      });
      setLanguage(response.language || 'zh');
      setUsesDefaultBot(Boolean(response.usesDefaultBot));
      setDefaultBotUsername(response.defaultBotUsername || '');
      setStatus(isEnglish ? 'Monitoring configuration saved.' : '监控配置已保存。');
    } catch (err) {
      setStatus(err.message || (isEnglish ? 'Save failed, please retry later.' : '保存失败，请稍后重试'));
    } finally {
      setLoading(false);
    }
  };

  const toggleGuide = () => {
    setGuideExpanded((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(GUIDE_EXPANDED_KEY, String(next));
        window.localStorage.setItem(GUIDE_SEEN_KEY, 'true');
      }
      return next;
    });
  };

  const guideToggleLabel = guideExpanded
    ? (isEnglish ? 'Hide Telegram guide' : '收起 Telegram 指南')
    : (isEnglish ? 'Show Telegram guide' : '展开 Telegram 指南');

  return (
    <section className="dashboard__section monitor-config">
      {/* 下面保持你现有的 JSX 结构 */}
    </section>
  );
}