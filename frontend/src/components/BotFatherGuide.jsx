import './BotFatherGuide.css';
import { useLanguage } from '../context/LanguageContext.jsx';

export default function BotFatherGuide({ usesDefaultBot = false, defaultBotUsername = '' }) {
  const { language } = useLanguage();
  const isEnglish = language === 'en';
  const hasBotName = Boolean(defaultBotUsername);

  return (
    <div className="botfather-guide">
      <h3>{isEnglish ? 'Telegram Chat ID Guide' : 'Telegram Chat ID 获取指南'}</h3>
      <ol>
        {usesDefaultBot ? (
          <>
            <li>
              {isEnglish ? (
                hasBotName ? (
                  <>
                    Search for <strong>@{defaultBotUsername}</strong> in Telegram and press <em>Start</em> once so the bot can message you.
                  </>
                ) : (
                  <>
                    Open the official monitoring bot in Telegram and press <em>Start</em> once to activate it for your chat.
                  </>
                )
              ) : hasBotName ? (
                <>
                  在 Telegram 搜索 <strong>@{defaultBotUsername}</strong> 并点击 <em>Start</em> 激活机器人。
                </>
              ) : (
                <>打开系统默认机器人，点击 <em>Start</em> 以便后端能够向您推送消息。</>
              )}
            </li>
            <li>
              {isEnglish ? (
                <>
                  Click "Get Code" to generate a verification code, then send this code to <strong>@{defaultBotUsername}</strong> (NOT to @TelegramBotRaw). After sending, click "Auto Get" to automatically retrieve your <code>chat_id</code>.
                </>
              ) : (
                <>
                  点击「获取验证码」生成验证码，然后将此验证码发送给 <strong>@{defaultBotUsername}</strong>（不要发送给 @TelegramBotRaw）。发送后，点击「自动获取」按钮即可自动获取 <code>chat_id</code>。
                </>
              )}
            </li>
            <li>
              {isEnglish ? (
                <>
                  Alternatively, you can manually get your <code>chat_id</code> by talking to <strong>@TelegramBotRaw</strong> and sending an arbitrary message. The bot will reply with your <code>chat_id</code>.
                </>
              ) : (
                <>
                  或者，您也可以通过 <strong>@TelegramBotRaw</strong> 手动获取：在 Telegram 中与 @TelegramBotRaw 对话，发送任意消息后即可获得返回的 <code>chat_id</code>。
                </>
              )}
            </li>
          </>
        ) : (
          <>
            <li>
              {isEnglish ? (
                <>
                  Talk to <strong>@TelegramBotRaw</strong> (or any bot that returns chat IDs) and send an arbitrary message. The bot will reply with your <code>chat_id</code>.
                </>
              ) : (
                <>
                  在 Telegram 中与 <strong>@TelegramBotRaw</strong> 对话，发送任意消息后即可获得返回的 <code>chat_id</code>。
                </>
              )}
            </li>
            <li>
              {isEnglish
                ? 'Copy the chat_id into the Monitoring Configuration form, enter wallet addresses, and save.'
                : '将 chat_id 粘贴到监控配置中，填写钱包地址后保存即可。'}
            </li>
          </>
        )}
      </ol>
      <div className="botfather-guide__illustration">
        <figure>
          <img
            src="https://raw.githubusercontent.com/barron-paw/new/main/6f9d09a6b016f25aa5c8726901a7bb66.jpg"
            alt={isEnglish ? 'Telegram Bot Raw returning chat_id' : 'Telegram Bot Raw 返回 chat_id 的界面'}
          />
          <figcaption>{isEnglish ? 'Telegram Bot Raw returning the chat_id' : '通过 Telegram Bot Raw 获取 chat_id'}</figcaption>
        </figure>
        <figure>
          <img
            src="https://raw.githubusercontent.com/barron-paw/new/main/2.jpg"
            alt={isEnglish ? 'Copy the chat_id into configuration' : '复制 chat_id 并粘贴到监控配置'}
          />
          <figcaption>{isEnglish ? 'Copy the chat_id and paste it into the monitoring form.' : '复制 chat_id，粘贴到监控配置表单中。'}</figcaption>
        </figure>
      </div>
    </div>
  );
}
