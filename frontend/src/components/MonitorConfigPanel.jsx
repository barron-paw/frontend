
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { fetchMonitorConfig, updateMonitorConfig } from '../api/config.js';
import { fetchWecomConfig, saveWecomConfig } from '../api/wecom.js';
import { useLanguage } from '../context/LanguageContext.jsx';

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
        console.error('Failed to load monitor config:', err);
        setStatus(isEnglish ? err.message || 'Failed to load monitor configuration' : err.message || '无法加载监控配置');
      } finally {
        setLoading(false);
      }
    };
    loadConfig();
  }, [canEdit]); // 只在 canEdit 改变时重新加载


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
      // 处理手机号：去除 @ 符号，只保留数字
      const mentions = form.wecomMentions
        .split(/[\s,]+/)
        .map((item) => item.trim().replace(/^@+/, '')) // 去除开头的 @ 符号
        .filter((item) => item && /^\d+$/.test(item)); // 只保留纯数字
      const wecomPayload = {
        enabled: form.wecomEnabled && Boolean(form.wecomWebhookUrl.trim()),
        webhookUrl: form.wecomWebhookUrl.trim() || null,
        mentions,
      };
      console.log('Saving WeCom config:', wecomPayload); // 调试日志
      const wecomResponse = await saveWecomConfig(wecomPayload);
      console.log('WeCom config saved:', wecomResponse); // 调试日志
      
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
                  <div className="monitor-config__field-header">
                    <span>{isEnglish ? 'Telegram Chat ID' : 'Telegram Chat ID'}</span>
                    <button
                      type="button"
                      className="monitor-config__help-button"
                      onClick={() => {
                        const guideContent = isEnglish
                          ? `Telegram Chat ID Setup Guide:

1. Open Telegram and search for @TelegramBotRaw (or use your own bot).

2. Start a conversation with the bot by clicking "Start" or sending any message.

3. The bot will reply with your Chat ID (a number, possibly negative for groups).

4. Copy the Chat ID and paste it into the "Telegram Chat ID" field above.

5. If you're using a group, make sure the bot is added to the group first.

6. Enable the toggle switch and click "保存配置" (Save) to activate Telegram notifications.`
                          : `Telegram Chat ID 配置指南：

1. 打开 Telegram，搜索 @TelegramBotRaw（或使用您自己的机器人）。

2. 点击 "Start" 或发送任意消息开始与机器人对话。

3. 机器人会回复您的 Chat ID（一个数字，群组可能是负数）。

4. 复制 Chat ID 并粘贴到上方的「Telegram Chat ID」输入框中。

5. 如果使用群组，请确保机器人已添加到群组中。

6. 勾选「启用 Telegram 推送」开关，点击「保存配置」即可启用 Telegram 推送功能。`;
                        
                        const images = [
                          'https://raw.githubusercontent.com/barron-paw/frontend/main/tg1.png',
                          'https://raw.githubusercontent.com/barron-paw/frontend/main/tg2.png',
                        ];
                        
                        const imageHtml = images.map((img, idx) => 
                          `<div style="margin: 10px 0;"><img src="${img}" alt="Step ${idx + 1}" style="max-width: 100%; border-radius: 4px;" /></div>`
                        ).join('');
                        
                        const fullContent = `
                          <div style="max-width: 600px; padding: 20px;">
                            <h3 style="margin-top: 0;">${isEnglish ? 'Telegram Chat ID Setup Guide' : 'Telegram Chat ID 配置指南'}</h3>
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
                      title={isEnglish ? 'Telegram setup guide' : 'Telegram 配置指南'}
                    >
                      ?
                    </button>
                  </div>
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
                    <div className="monitor-config__field-header">
                      <span>{isEnglish ? 'Enterprise WeChat Webhook URL' : '企业微信 Webhook 地址'}</span>
                      <button
                        type="button"
                        className="monitor-config__help-button"
                        onClick={() => {
                          const guideContent = isEnglish
                            ? `Enterprise WeChat Webhook Setup Guide:

1. Open Enterprise WeChat (企业微信) on your mobile device or desktop app.

2. Navigate to the group where you want to receive notifications, tap the group settings (右上角三个点), and select "群机器人" (Group Bot).

3. Click "添加机器人" (Add Bot), give it a name, and confirm. The system will generate a webhook URL.

4. Copy the webhook URL (it should start with https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=...) and paste it into the "Webhook 地址" field above.

5. (Optional) If you want to @mention specific members, enter their mobile numbers (registered in Enterprise WeChat) in the "需 @ 的手机号" field, separated by commas or newlines.

6. Enable the toggle switch and click "保存配置" (Save) to activate Enterprise WeChat notifications.`
                            : `企业微信 Webhook 配置指南：

1. 打开企业微信（手机端或桌面端）。

2. 进入需要接收通知的群聊，点击右上角三个点，选择「群机器人」。

3. 点击「添加机器人」，为机器人命名并确认。系统会生成一个 webhook 地址。

4. 复制生成的 webhook 地址（通常以 https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=... 开头），粘贴到上方的「Webhook 地址」输入框中。

5. （可选）如需 @ 提醒特定成员，在「需 @ 的手机号」输入框中填写他们的手机号（需在企业微信中注册），多个手机号可用逗号或换行分隔。

6. 勾选「启用企业微信推送」开关，点击「保存配置」即可启用企业微信推送功能。`;
                          
                          const images = [
                            'https://raw.githubusercontent.com/barron-paw/frontend/main/1.png',
                            'https://raw.githubusercontent.com/barron-paw/frontend/main/2.png',
                            'https://raw.githubusercontent.com/barron-paw/frontend/main/3.png',
                            'https://raw.githubusercontent.com/barron-paw/frontend/main/4.png',
                            'https://raw.githubusercontent.com/barron-paw/frontend/main/5.png',
                            'https://raw.githubusercontent.com/barron-paw/frontend/main/6.png',
                          ];
                          
                          const imageHtml = images.map((img, idx) => 
                            `<div style="margin: 10px 0;"><img src="${img}" alt="Step ${idx + 1}" style="max-width: 100%; border-radius: 4px;" /></div>`
                          ).join('');
                          
                          const fullContent = `
                            <div style="max-width: 600px; padding: 20px;">
                              <h3 style="margin-top: 0;">${isEnglish ? 'Enterprise WeChat Webhook Setup Guide' : '企业微信 Webhook 配置指南'}</h3>
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
                        title={isEnglish ? 'Enterprise WeChat setup guide' : '企业微信配置指南'}
                      >
                        ?
                      </button>
                    </div>
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


        </div>
    </section>
  );
}