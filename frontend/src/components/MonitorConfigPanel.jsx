
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { fetchMonitorConfig, updateMonitorConfig } from '../api/config.js';
import { fetchWecomConfig, saveWecomConfig } from '../api/wecom.js';
import BotFatherGuide from './BotFatherGuide.jsx';
import WeComGuide from './WeComGuide.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';

const GUIDE_EXPANDED_KEY = 'hm_telegram_guide_expanded';
const GUIDE_SEEN_KEY = 'hm_telegram_guide_seen';
const WECOM_GUIDE_EXPANDED_KEY = 'hm_wecom_guide_expanded';
const WECOM_GUIDE_SEEN_KEY = 'hm_wecom_guide_seen';

export default function MonitorConfigPanel() {
  const { user } = useAuth();
  const { language, setLanguage } = useLanguage();
  const isEnglish = language === 'en';
  const [form, setForm] = useState({
    telegramChatId: '',
    walletAddresses: '',
    language: 'zh',
    telegramEnabled: true,
    wecomEnabled: false,
    wecomWebhookUrl: '',
    wecomMentions: '',
  });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [usesDefaultBot, setUsesDefaultBot] = useState(false);
  const [defaultBotUsername, setDefaultBotUsername] = useState('');
  const [telegramGuideExpanded, setTelegramGuideExpanded] = useState(true);
  const [wecomGuideExpanded, setWecomGuideExpanded] = useState(true);

  const canEdit = user?.can_access_monitor;

  useEffect(() => {
    const loadConfig = async () => {
      if (!canEdit) {
        return;
      }
      setLoading(true);
      try {
        const [monitorData, wecomData] = await Promise.all([
          fetchMonitorConfig(),
          fetchWecomConfig().catch(() => ({ enabled: false, webhookUrl: '', mentions: [] })),
        ]);
        setForm({
          telegramChatId: monitorData.telegramChatId || '',
          walletAddresses: (monitorData.walletAddresses || []).join('\n'),
          language: monitorData.language || 'zh',
          telegramEnabled: Boolean(monitorData.telegramChatId),
          wecomEnabled: Boolean(wecomData.enabled),
          wecomWebhookUrl: wecomData.webhookUrl || '',
          wecomMentions: (wecomData.mentions || []).join('\n'),
        });
        setLanguage(monitorData.language || 'zh');
        setUsesDefaultBot(Boolean(monitorData.usesDefaultBot));
        setDefaultBotUsername(monitorData.defaultBotUsername || '');
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
    // Telegram guide state
    const stored = window.localStorage.getItem(GUIDE_EXPANDED_KEY);
    if (stored !== null) {
      setTelegramGuideExpanded(stored === 'true');
    } else {
      const seen = window.localStorage.getItem(GUIDE_SEEN_KEY);
      if (seen) {
        setTelegramGuideExpanded(false);
      } else {
        window.localStorage.setItem(GUIDE_SEEN_KEY, 'true');
        window.localStorage.setItem(GUIDE_EXPANDED_KEY, 'true');
        setTelegramGuideExpanded(true);
      }
    }
    // WeCom guide state
    const wecomStored = window.localStorage.getItem(WECOM_GUIDE_EXPANDED_KEY);
    if (wecomStored !== null) {
      setWecomGuideExpanded(wecomStored === 'true');
    } else {
      const wecomSeen = window.localStorage.getItem(WECOM_GUIDE_SEEN_KEY);
      if (wecomSeen) {
        setWecomGuideExpanded(false);
      } else {
        window.localStorage.setItem(WECOM_GUIDE_SEEN_KEY, 'true');
        window.localStorage.setItem(WECOM_GUIDE_EXPANDED_KEY, 'true');
        setWecomGuideExpanded(true);
      }
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
      // Save monitor config
      const monitorPayload = {
        telegramChatId: form.telegramEnabled ? (form.telegramChatId.trim() || null) : null,
        walletAddresses: form.walletAddresses
          .split(/[\s,;]+/)
          .map((addr) => addr.trim())
          .filter(Boolean)
          .slice(0, 2),
        language: form.language,
      };
      const monitorResponse = await updateMonitorConfig(monitorPayload);
      
      // Save WeCom config
      const mentions = form.wecomMentions
        .split(/[\s,]+/)
        .map((item) => item.trim())
        .filter(Boolean);
      const wecomPayload = {
        enabled: form.wecomEnabled && Boolean(form.wecomWebhookUrl.trim()),
        webhookUrl: form.wecomWebhookUrl.trim() || null,
        mentions,
      };
      const wecomResponse = await saveWecomConfig(wecomPayload);
      
      setForm({
        telegramChatId: monitorResponse.telegramChatId || '',
        walletAddresses: (monitorResponse.walletAddresses || []).join('\n'),
        language: monitorResponse.language || 'zh',
        telegramEnabled: Boolean(monitorResponse.telegramChatId),
        wecomEnabled: Boolean(wecomResponse.enabled),
        wecomWebhookUrl: wecomResponse.webhookUrl || '',
        wecomMentions: (wecomResponse.mentions || []).join('\n'),
      });
      setLanguage(monitorResponse.language || 'zh');
      setUsesDefaultBot(Boolean(monitorResponse.usesDefaultBot));
      setDefaultBotUsername(monitorResponse.defaultBotUsername || '');
      setStatus(isEnglish ? 'Configuration saved.' : '配置已保存。');
    } catch (err) {
      setStatus(err.message || (isEnglish ? 'Save failed, please retry later.' : '保存失败，请稍后重试'));
    } finally {
      setLoading(false);
    }
  };

  const toggleTelegramGuide = () => {
    setTelegramGuideExpanded((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(GUIDE_EXPANDED_KEY, String(next));
        window.localStorage.setItem(GUIDE_SEEN_KEY, 'true');
      }
      return next;
    });
  };

  const toggleWecomGuide = () => {
    setWecomGuideExpanded((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(WECOM_GUIDE_EXPANDED_KEY, String(next));
        window.localStorage.setItem(WECOM_GUIDE_SEEN_KEY, 'true');
      }
      return next;
    });
  };

  const telegramGuideToggleLabel = telegramGuideExpanded
    ? (isEnglish ? 'Hide Telegram guide' : '收起 Telegram 指南')
    : (isEnglish ? 'Show Telegram guide' : '展开 Telegram 指南');

  const wecomGuideToggleLabel = wecomGuideExpanded
    ? (isEnglish ? 'Hide Enterprise WeChat guide' : '收起企业微信指南')
    : (isEnglish ? 'Show Enterprise WeChat guide' : '展开企业微信指南');

  return (
    <section className="dashboard__section monitor-config">
      <div className="monitor-config__header">
        <div>
          <h2>{isEnglish ? 'Monitoring Configuration' : '监控配置'}</h2>
          <p>
            {isEnglish
              ? 'Configure notification channels (Telegram or Enterprise WeChat) and wallet addresses to monitor. The system already uses the official Telegram bot token for you.'
              : '配置推送渠道（Telegram 或企业微信）和要监控的钱包地址。系统已为您配置官方 Telegram 机器人 Token。'}
          </p>
        </div>
        {status ? <div className="monitor-config__status">{status}</div> : null}
      </div>

      {helperText ? <p className="monitor-config__helper">{helperText}</p> : null}

      <div className="monitor-config__card monitor-config__card--form">
          <form className="monitor-config__form" onSubmit={handleSubmit}>
            <div className="monitor-config__fieldset">
              <span className="monitor-config__legend">{isEnglish ? 'Notification Channels' : '推送渠道'}</span>
              
              <div className="monitor-config__notification-toggle">
                <label className="monitor-config__field monitor-config__field--inline">
                  <input
                    type="checkbox"
                    checked={form.telegramEnabled}
                    onChange={(event) => setForm((prev) => ({ ...prev, telegramEnabled: event.target.checked }))}
                    disabled={!canEdit || loading}
                  />
                  <span>{isEnglish ? 'Enable Telegram notifications' : '启用 Telegram 推送'}</span>
                </label>
                <label className="monitor-config__field monitor-config__field--inline">
                  <input
                    type="checkbox"
                    checked={form.wecomEnabled}
                    onChange={(event) => setForm((prev) => ({ ...prev, wecomEnabled: event.target.checked }))}
                    disabled={!canEdit || loading}
                  />
                  <span>{isEnglish ? 'Enable Enterprise WeChat notifications' : '启用企业微信推送'}</span>
                </label>
              </div>

              {form.telegramEnabled && (
                <label className="monitor-config__field">
                  <span>{isEnglish ? 'Telegram Chat ID' : 'Telegram Chat ID'}</span>
                  <input
                    type="text"
                    value={form.telegramChatId}
                    onChange={(event) => setForm((prev) => ({ ...prev, telegramChatId: event.target.value }))}
                    placeholder={isEnglish ? 'Group or chat ID' : '群组或私聊 ID'}
                    disabled={!canEdit || loading}
                  />
                  <small>
                    {isEnglish ? (
                      <>
                        {usesDefaultBot
                          ? 'Our default bot token is preconfigured. Talk to '
                          : 'Provide the chat ID used by your Telegram bot. Talk to '}
                        <strong>@TelegramBotRaw</strong> to obtain the ID.
                      </>
                    ) : (
                      <>
                        {usesDefaultBot ? '系统已内置官方机器人 Token。' : '如使用自建机器人请填写对应 chat_id。'}
                        通过 <strong>@TelegramBotRaw</strong> 发送消息即可返回 chat_id。
                      </>
                    )}
                  </small>
                  {usesDefaultBot ? (
                    <small className="monitor-config__field-note">
                      {isEnglish
                        ? defaultBotUsername
                          ? `Default bot: ${defaultBotUsername}. Open Telegram, search for it, press Start once.`
                          : 'Default bot token is active. Open Telegram and press Start on the official bot.'
                        : defaultBotUsername
                          ? `默认机器人：${defaultBotUsername}，在 Telegram 搜索并点击 Start 即可。`
                          : '已启用默认机器人，请在 Telegram 中打开官方机器人并点击 Start。'}
                    </small>
                  ) : null}
                </label>
              )}

              {form.wecomEnabled && (
                <>
                  <label className="monitor-config__field">
                    <span>{isEnglish ? 'Enterprise WeChat Webhook URL' : '企业微信 Webhook 地址'}</span>
                    <input
                      type="text"
                      value={form.wecomWebhookUrl}
                      onChange={(event) => setForm((prev) => ({ ...prev, wecomWebhookUrl: event.target.value }))}
                      placeholder={isEnglish ? 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?...' : 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?...'}
                      disabled={!canEdit || loading}
                    />
                    <small>
                      {isEnglish
                        ? 'Create an Enterprise WeChat bot and copy the webhook address here. Messages are only sent when enabled.'
                        : '在企业微信中添加群机器人，并将生成的 webhook 地址粘贴至此。启用后将推送监控消息。'}
                    </small>
                  </label>
                  <label className="monitor-config__field">
                    <div className="monitor-config__field-header">
                      <span>{isEnglish ? 'Mobile numbers to @mention (optional)' : '需 @ 的手机号（可选）'}</span>
                      <button
                        type="button"
                        className="monitor-config__help-button"
                        onClick={() => {
                          alert(isEnglish 
                            ? 'Enter mobile numbers registered in Enterprise WeChat. These users will be @mentioned in push messages for better visibility.'
                            : '填写在企业微信中注册的手机号。推送消息时会 @ 提醒这些用户，提高消息可见性。');
                        }}
                        title={isEnglish ? 'What is this for?' : '这是做什么用的？'}
                      >
                        ?
                      </button>
                    </div>
                    <textarea
                      rows={3}
                      value={form.wecomMentions}
                      onChange={(event) => setForm((prev) => ({ ...prev, wecomMentions: event.target.value }))}
                      placeholder={isEnglish ? 'Separate multiple numbers with comma or newline' : '多个手机号可用逗号或换行分隔'}
                      disabled={!canEdit || loading}
                    />
                    <small>
                      {isEnglish
                        ? 'These users will be @mentioned in push messages for better visibility.'
                        : '推送消息时会 @ 提醒这些用户，提高消息可见性。'}
                    </small>
                  </label>
                </>
              )}
            </div>

            <div className="monitor-config__fieldset">
              <span className="monitor-config__legend">{isEnglish ? 'Wallet Addresses' : '钱包列表'}</span>
              <label className="monitor-config__field">
                <span>{isEnglish ? 'Addresses to Monitor' : '监控地址'}</span>
                <textarea
                  rows={5}
                  value={form.walletAddresses}
                  onChange={(event) => setForm((prev) => ({ ...prev, walletAddresses: event.target.value }))}
                  placeholder={isEnglish ? '0x1234...\n0xabcd...' : '0x1234...\n0xabcd...'}
                  disabled={!canEdit || loading}
                />
                <small>
                  {isEnglish
                    ? 'One address per line (or separated by commas). Up to 2 wallets are monitored.'
                    : '每行一个地址，最多监控 2 个地址。'}
                </small>
              </label>
            </div>

            <div className="monitor-config__fieldset">
              <span className="monitor-config__legend">{isEnglish ? 'Language' : '语言'}</span>
              <label className="monitor-config__field">
                <span>{isEnglish ? 'Interface language' : '界面语言'}</span>
                <select
                  value={form.language}
                  onChange={(event) => setForm((prev) => ({ ...prev, language: event.target.value }))}
                  disabled={!canEdit || loading}
                >
                  <option value="zh">中文</option>
                  <option value="en">English</option>
                </select>
                <small>
                  {isEnglish
                    ? 'Selecting English will switch the UI and Telegram notifications to English.'
                    : '选择英语后，前端界面与推送信息将使用英文。'}
                </small>
              </label>
            </div>

            <div className="monitor-config__actions">
              <button type="submit" disabled={!canEdit || loading}>
                {loading ? (isEnglish ? 'Processing…' : '处理中…') : isEnglish ? 'Save' : '保存配置'}
              </button>
              <p className="monitor-config__hint">
                {isEnglish
                  ? 'After saving, check the console to confirm the monitoring service is running.'
                  : '保存后可在控制台查看监控线程是否启动。'}
              </p>
            </div>

            <div className="monitor-config__details">
              <p className="monitor-config__details-title">{isEnglish ? 'Monitoring Behaviour' : '监控提醒说明'}</p>
              <ul className="monitor-config__details-list">
                <li>{isEnglish ? 'Every time you save the configuration, a fresh position snapshot is pushed immediately.' : '每次保存配置后，立即发送当前持仓快照。'}</li>
                <li>{isEnglish ? 'After monitoring is enabled, every open or close event triggers a notification.' : '保存配置并启用监控后，每次开仓或平仓都会推送提醒。'}</li>
                <li>{isEnglish ? 'A consolidated position snapshot is delivered every 4 hours automatically.' : '系统会每 4 小时自动发送一次持仓快照。'}</li>
              </ul>
            </div>
          </form>

          {form.telegramEnabled && (
            <div className="monitor-config__guide">
              <button type="button" className="monitor-config__guide-toggle" onClick={toggleTelegramGuide}>
                {telegramGuideExpanded ? '▼' : '▶'} {telegramGuideToggleLabel}
              </button>
              {telegramGuideExpanded && <BotFatherGuide usesDefaultBot={usesDefaultBot} defaultBotUsername={defaultBotUsername} />}
            </div>
          )}

          {form.wecomEnabled && (
            <div className="monitor-config__guide">
              <button type="button" className="monitor-config__guide-toggle" onClick={toggleWecomGuide}>
                {wecomGuideExpanded ? '▼' : '▶'} {wecomGuideToggleLabel}
              </button>
              {wecomGuideExpanded && <WeComGuide />}
            </div>
          )}
        </div>
    </section>
  );
}