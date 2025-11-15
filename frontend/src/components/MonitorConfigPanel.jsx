
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { fetchMonitorConfig, updateMonitorConfig, fetchTelegramChatId, getTelegramVerificationCode } from '../api/config.js';
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
  const [fetchingChatId, setFetchingChatId] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [showVerificationCode, setShowVerificationCode] = useState(false);

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
                        const botHint = usesDefaultBot && defaultBotUsername 
                          ? `send this verification code to the default bot <strong>@${defaultBotUsername}</strong> (NOT to @TelegramBotRaw)`
                          : 'send this verification code to your bot (the bot configured in your settings, or the default bot if using the default token)';
                        const botWarning = usesDefaultBot && defaultBotUsername 
                          ? `\n\n⚠️ Important: If you're using the default bot, make sure to send the verification code to <strong>@${defaultBotUsername}</strong>, NOT to @TelegramBotRaw!`
                          : '';
                        const botHintZh = usesDefaultBot && defaultBotUsername 
                          ? `将此验证码发送给默认机器人 <strong>@${defaultBotUsername}</strong>（不要发送给 @TelegramBotRaw）`
                          : '将此验证码发送给您的机器人（使用您配置的机器人，或使用默认机器人）';
                        const botWarningZh = usesDefaultBot && defaultBotUsername 
                          ? `\n\n⚠️ 重要提示：如果您使用默认机器人，请务必将验证码发送给 <strong>@${defaultBotUsername}</strong>，而不是 @TelegramBotRaw！`
                          : '';
                        
                        const guideContent = isEnglish
                          ? `Telegram Chat ID Setup Guide:

Method 1 - Automatic (Recommended):
1. Click the "Get Code" button to generate a unique verification code.

2. Open Telegram and ${botHint}.

3. After sending the code, click the "Auto Get" button next to the Chat ID input field.

4. The system will automatically find your message containing the verification code and retrieve your Chat ID, then save it.

Note: Each user gets a unique verification code based on their account, so the system can correctly identify which chat_id belongs to you. The verification code is valid for 5 minutes.${botWarning}

Method 2 - Manual:
1. Open Telegram and search for @TelegramBotRaw (or use your own bot).

2. Start a conversation with the bot by clicking "Start" or sending any message.

3. The bot will reply with your Chat ID (a number, possibly negative for groups).

4. Copy the Chat ID and paste it into the "Telegram Chat ID" field above.

5. If you're using a group, make sure the bot is added to the group first.

6. Enable the toggle switch and click "保存配置" (Save) to activate Telegram notifications.`
                          : `Telegram Chat ID 配置指南：

方法一 - 自动获取（推荐）：
1. 点击「获取验证码」按钮生成一个唯一的验证码。

2. 打开 Telegram，${botHintZh}。

3. 发送验证码后，点击 Chat ID 输入框旁边的「自动获取」按钮。

4. 系统将自动找到包含验证码的消息，获取您的 Chat ID 并保存。

注意：每个用户都会获得基于其账户的唯一验证码，因此系统可以正确识别哪个 chat_id 属于您。验证码有效期为5分钟。${botWarningZh}

方法二 - 手动获取：
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
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                      type="text"
                      value={form.telegramChatId}
                      onChange={(event) => setForm((prev) => ({ ...prev, telegramChatId: event.target.value }))}
                      placeholder={isEnglish ? 'Group or chat ID' : '群组或私聊 ID'}
                      disabled={!canEdit || loading}
                      style={{ flex: 1, minWidth: '200px' }}
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        if (!canEdit) return;
                        setStatus('');
                        try {
                          const result = await getTelegramVerificationCode();
                          if (result.success && result.verification_code) {
                            setVerificationCode(result.verification_code);
                            setShowVerificationCode(true);
                            setStatus(isEnglish 
                              ? `Verification code generated: ${result.verification_code}. Please send this code to your bot, then click "Auto Get".` 
                              : `验证码已生成：${result.verification_code}。请将此验证码发送给您的机器人，然后点击「自动获取」。`);
                          }
                        } catch (err) {
                          setStatus(err.message || (isEnglish ? 'Failed to generate verification code.' : '生成验证码失败。'));
                        }
                      }}
                      disabled={!canEdit || loading}
                      style={{
                        padding: '8px 16px',
                        background: 'var(--accent-secondary, #4caf50)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: !canEdit ? 'not-allowed' : 'pointer',
                        opacity: !canEdit ? 0.6 : 1,
                        whiteSpace: 'nowrap',
                        fontSize: '0.9rem',
                      }}
                    >
                      {isEnglish ? 'Get Code' : '获取验证码'}
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!canEdit || fetchingChatId) return;
                        if (!verificationCode) {
                          setStatus(isEnglish ? 'Please get a verification code first.' : '请先获取验证码。');
                          return;
                        }
                        setFetchingChatId(true);
                        setStatus('');
                        try {
                          const result = await fetchTelegramChatId();
                          if (result.success && result.chat_id) {
                            setForm((prev) => ({ ...prev, telegramChatId: result.chat_id }));
                            setStatus(isEnglish ? 'Chat ID retrieved and saved successfully!' : 'Chat ID 已成功获取并保存！');
                            setShowVerificationCode(false);
                            setVerificationCode('');
                            // 重新加载配置以更新状态
                            const monitorData = await fetchMonitorConfig();
                            setForm((prev) => ({
                              ...prev,
                              telegramChatId: monitorData.telegramChatId || '',
                              telegramEnabled: Boolean(monitorData.telegramChatId),
                            }));
                          } else {
                            setStatus(result.message || (isEnglish ? 'Failed to get chat ID. Please make sure you sent the verification code to your bot within the last 5 minutes.' : '获取 Chat ID 失败。请确保您已在最近5分钟内将验证码发送给机器人。'));
                          }
                        } catch (err) {
                          setStatus(err.message || (isEnglish ? 'Failed to fetch chat ID. Please try again.' : '获取 Chat ID 失败，请重试。'));
                        } finally {
                          setFetchingChatId(false);
                        }
                      }}
                      disabled={!canEdit || loading || fetchingChatId || !verificationCode}
                      style={{
                        padding: '8px 16px',
                        background: 'var(--accent-primary, #5b7cfa)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: fetchingChatId || !canEdit || !verificationCode ? 'not-allowed' : 'pointer',
                        opacity: fetchingChatId || !canEdit || !verificationCode ? 0.6 : 1,
                        whiteSpace: 'nowrap',
                        fontSize: '0.9rem',
                      }}
                    >
                      {fetchingChatId
                        ? (isEnglish ? 'Fetching...' : '获取中...')
                        : (isEnglish ? 'Auto Get' : '自动获取')}
                    </button>
                  </div>
                  {showVerificationCode && verificationCode && (
                    <div style={{
                      padding: '12px',
                      background: 'rgba(91, 124, 250, 0.1)',
                      border: '1px solid var(--accent-primary, #5b7cfa)',
                      borderRadius: '6px',
                      marginTop: '8px',
                    }}>
                      <div style={{ fontWeight: 'bold', marginBottom: '8px', color: 'var(--text-primary, #fff)' }}>
                        {isEnglish ? 'Verification Code:' : '验证码：'}
                      </div>
                      <div style={{
                        fontFamily: 'monospace',
                        fontSize: '1.2rem',
                        fontWeight: 'bold',
                        color: 'var(--accent-primary, #5b7cfa)',
                        marginBottom: '8px',
                        padding: '8px',
                        background: 'rgba(0, 0, 0, 0.2)',
                        borderRadius: '4px',
                        textAlign: 'center',
                      }}>
                        {verificationCode}
                      </div>
                      <div style={{ fontSize: '0.9rem', color: 'var(--text-muted, #999)' }}>
                        {isEnglish ? (
                          <>
                            Please send this code <strong>"{verificationCode}"</strong> to{' '}
                            {usesDefaultBot && defaultBotUsername ? (
                              <>your bot <strong>@{defaultBotUsername}</strong></>
                            ) : (
                              <>your configured Telegram bot</>
                            )}
                            , then click "Auto Get" button. The code is valid for 5 minutes.
                            {usesDefaultBot && defaultBotUsername && (
                              <div style={{ marginTop: '8px', color: 'var(--accent-primary, #5b7cfa)' }}>
                                ⚠️ Important: Send to <strong>@{defaultBotUsername}</strong>, NOT to @TelegramBotRaw!
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            请将此验证码 <strong>"{verificationCode}"</strong> 发送给{' '}
                            {usesDefaultBot && defaultBotUsername ? (
                              <>您的机器人 <strong>@{defaultBotUsername}</strong></>
                            ) : (
                              <>您配置的 Telegram 机器人</>
                            )}
                            ，然后点击「自动获取」按钮。验证码有效期为5分钟。
                            {usesDefaultBot && defaultBotUsername && (
                              <div style={{ marginTop: '8px', color: 'var(--accent-primary, #5b7cfa)' }}>
                                ⚠️ 重要：请发送给 <strong>@{defaultBotUsername}</strong>，不要发送给 @TelegramBotRaw！
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}
                  <small>
                    {isEnglish ? (
                      <>
                        {usesDefaultBot && defaultBotUsername ? (
                          <>
                            Our default bot <strong>@{defaultBotUsername}</strong> is preconfigured. Click "Get Code" to generate a verification code, send it to <strong>@{defaultBotUsername}</strong> (NOT to @TelegramBotRaw), then click "Auto Get" to retrieve your Chat ID. Or talk to <strong>@TelegramBotRaw</strong> to obtain the ID manually.
                          </>
                        ) : usesDefaultBot ? (
                          <>
                            Our default bot token is preconfigured. Click "Get Code" to generate a verification code, send it to your bot, then click "Auto Get" to retrieve your Chat ID. Or talk to <strong>@TelegramBotRaw</strong> to obtain the ID manually.
                          </>
                        ) : (
                          <>
                            Click "Get Code" to generate a verification code, send it to your bot, then click "Auto Get" to retrieve your Chat ID. Or talk to <strong>@TelegramBotRaw</strong> to obtain the ID manually.
                          </>
                        )}
                      </>
                    ) : (
                      <>
                        {usesDefaultBot && defaultBotUsername ? (
                          <>
                            系统已内置默认机器人 <strong>@{defaultBotUsername}</strong>。点击「获取验证码」生成验证码，将验证码发送给 <strong>@{defaultBotUsername}</strong>（不要发送给 @TelegramBotRaw），然后点击「自动获取」按钮即可自动获取 chat_id。或通过 <strong>@TelegramBotRaw</strong> 手动获取。
                          </>
                        ) : usesDefaultBot ? (
                          <>
                            系统已内置官方机器人 Token。点击「获取验证码」生成验证码，将验证码发送给您的机器人，然后点击「自动获取」按钮即可自动获取 chat_id。或通过 <strong>@TelegramBotRaw</strong> 手动获取。
                          </>
                        ) : (
                          <>
                            如使用自建机器人请填写对应 chat_id。点击「获取验证码」生成验证码，将验证码发送给您的机器人，然后点击「自动获取」按钮即可自动获取 chat_id。或通过 <strong>@TelegramBotRaw</strong> 手动获取。
                          </>
                        )}
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

Step 1: Open Enterprise WeChat (企业微信) on your mobile device or desktop app. Make sure you are logged in to your account. You should see the main message interface with your conversations.

Step 2: Tap on the top-left corner of the message interface. You will see a menu icon (usually three horizontal lines or a back arrow) in the top-left corner. Tap on it to access the main menu.

Step 3: In the menu that appears, find and select "Create Enterprise" (创建企业) option. This will allow you to set up a new enterprise account. If you already have an enterprise account, you can select your existing enterprise from the list instead.

Step 4: Complete the enterprise information form. You will be prompted to fill in various details such as:
   - Enterprise name (企业名称)
   - Industry type (行业类型)
   - Other supplementary information as required
Fill in all the required fields and submit the form to complete the enterprise setup.

Step 5: After setting up or selecting your enterprise, navigate to the group chat where you want to receive Hyperliquid monitoring notifications. Once you are in the group chat, look for the three dots icon (⋮) in the top-right corner of the screen. Tap on it to open the group settings menu.

Step 6: In the group settings menu, scroll down to find the "Message Push" (消息推送) option. This option is usually located further down in the settings list, so you may need to scroll down to see it. Tap on "Message Push" (消息推送) to access the message push settings page.

Step 7: On the message push settings page, you will see an "Add Bot" (添加机器人) button. Tap on this button to create a new bot for this group. The system will generate a unique webhook URL for your bot.

Step 8: After the bot is created successfully, you will see the webhook URL displayed on the screen. The webhook URL will start with "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=..." followed by a long string of characters (the API key). IMPORTANT: Copy the entire webhook URL carefully, making sure to include all characters from the beginning to the end. Then paste it into the "Webhook 地址" (Webhook URL) field in the form above.

Step 9: (Optional) If you want to @mention specific members when notifications are sent, enter their mobile numbers (as registered in Enterprise WeChat) in the "需 @ 的手机号" (Mobile numbers to @mention) field. You can separate multiple numbers with commas or newlines. This will ensure that these members receive notifications when monitoring alerts are sent.

Finally: Enable the "启用企业微信推送" (Enable Enterprise WeChat notifications) toggle switch, and click "保存配置" (Save Configuration) to activate Enterprise WeChat notifications. You will start receiving Hyperliquid monitoring messages in your Enterprise WeChat group.`
                            : `企业微信 Webhook 配置指南：

步骤 1：打开企业微信（手机端或桌面端），确保已登录您的企业微信账号。您应该能看到主消息界面，显示您的对话列表。

步骤 2：点击消息界面的左上角。您会在左上角看到一个菜单图标（通常是三条横线或返回箭头）。点击它来打开主菜单。

步骤 3：在出现的菜单中，找到并点击「创建企业」选项。这将允许您创建新的企业账号。如果您已有企业账号，也可以从列表中选择您现有的企业。

步骤 4：完成企业信息补充。系统会提示您填写以下信息：
   - 企业名称
   - 行业类型
   - 其他必要的补充信息
请填写所有必填字段并提交表单，以完成企业设置。

步骤 5：设置或选择企业后，进入需要接收 Hyperliquid 监控通知的群聊。进入群聊后，找到屏幕右上角的三个点图标（⋮）。点击它来打开群聊设置菜单。

步骤 6：在群聊设置菜单中，向下滑动找到「消息推送」选项。该选项通常位于设置列表的较下方，因此您可能需要向下滚动才能看到它。点击「消息推送」进入消息推送设置页面。

步骤 7：在消息推送设置页面上，您会看到一个「添加机器人」按钮。点击此按钮为该群聊创建一个新的机器人。系统会为您的机器人生成一个唯一的 webhook 地址。

步骤 8：机器人创建成功后，您将看到生成的 webhook 地址显示在屏幕上。webhook 地址通常以 "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=..." 开头，后面跟着一长串字符（API 密钥）。重要：请仔细复制完整的 webhook 地址，确保包含从开头到结尾的所有字符。然后将其粘贴到上方表单中的「Webhook 地址」输入框中。

步骤 9：（可选）如果您希望在发送通知时 @ 提醒特定成员，请在「需 @ 的手机号」输入框中填写他们的手机号（需在企业微信中注册）。多个手机号可用逗号或换行分隔。这将确保这些成员在发送监控提醒时收到通知。

最后：勾选「启用企业微信推送」开关，点击「保存配置」按钮即可启用企业微信推送功能。之后您将在企业微信群聊中收到 Hyperliquid 监控消息。`;
                          
                          const images = [
                            'https://raw.githubusercontent.com/barron-paw/frontend/main/1.png',
                            'https://raw.githubusercontent.com/barron-paw/frontend/main/2.png',
                            'https://raw.githubusercontent.com/barron-paw/frontend/main/3.png',
                            'https://raw.githubusercontent.com/barron-paw/frontend/main/4.png',
                            'https://raw.githubusercontent.com/barron-paw/frontend/main/5.png',
                            'https://raw.githubusercontent.com/barron-paw/frontend/main/6.png',
                            'https://raw.githubusercontent.com/barron-paw/frontend/main/7.png',
                            'https://raw.githubusercontent.com/barron-paw/frontend/main/8.png',
                            'https://raw.githubusercontent.com/barron-paw/frontend/main/9.png',
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
                              <h3 style="margin-top: 0; margin-bottom: 20px; font-size: 1.5rem;">${isEnglish ? 'Enterprise WeChat Webhook Setup Guide' : '企业微信 Webhook 配置指南'}</h3>
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