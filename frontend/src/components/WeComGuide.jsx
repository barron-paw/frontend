import './BotFatherGuide.css';
import { useLanguage } from '../context/LanguageContext.jsx';

export default function WeComGuide() {
  const { language } = useLanguage();
  const isEnglish = language === 'en';

  return (
    <div className="botfather-guide">
      <h3>{isEnglish ? 'Enterprise WeChat Webhook Setup Guide' : '企业微信 Webhook 配置指南'}</h3>
      <ol>
        <li>
          {isEnglish
            ? 'Open Enterprise WeChat (企业微信) on your mobile device or desktop app.'
            : '打开企业微信（手机端或桌面端）。'}
        </li>
        <li>
          {isEnglish
            ? 'Navigate to the group where you want to receive notifications, tap the group settings (右上角三个点), and select "群机器人" (Group Bot).'
            : '进入需要接收通知的群聊，点击右上角三个点，选择「群机器人」。'}
        </li>
        <li>
          {isEnglish
            ? 'Click "添加机器人" (Add Bot), give it a name, and confirm. The system will generate a webhook URL.'
            : '点击「添加机器人」，为机器人命名并确认。系统会生成一个 webhook 地址。'}
        </li>
        <li>
          {isEnglish
            ? 'Copy the webhook URL (it should start with https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=...) and paste it into the "Webhook 地址" field above.'
            : '复制生成的 webhook 地址（通常以 https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=... 开头），粘贴到上方的「Webhook 地址」输入框中。'}
        </li>
        <li>
          {isEnglish
            ? '(Optional) If you want to @mention specific members, enter their mobile numbers (registered in Enterprise WeChat) in the "需 @ 的手机号" field, separated by commas or newlines.'
            : '（可选）如需 @ 提醒特定成员，在「需 @ 的手机号」输入框中填写他们的手机号（需在企业微信中注册），多个手机号可用逗号或换行分隔。'}
        </li>
        <li>
          {isEnglish
            ? 'Enable the toggle switch and click "保存配置" (Save) to activate Enterprise WeChat notifications.'
            : '勾选「启用企业微信推送」开关，点击「保存配置」即可启用企业微信推送功能。'}
        </li>
      </ol>
      <div className="botfather-guide__illustration">
        <figure>
          <img
            src="https://raw.githubusercontent.com/barron-paw/new/main/1.jpg"
            alt={isEnglish ? 'Enterprise WeChat group bot settings' : '企业微信群机器人设置'}
          />
          <figcaption>{isEnglish ? 'Add a group bot in Enterprise WeChat' : '在企业微信中添加群机器人'}</figcaption>
        </figure>
        <figure>
          <img
            src="https://raw.githubusercontent.com/barron-paw/new/main/2.jpg"
            alt={isEnglish ? 'Copy the webhook URL' : '复制 webhook 地址'}
          />
          <figcaption>{isEnglish ? 'Copy the webhook URL and paste it into the configuration form' : '复制 webhook 地址并粘贴到配置表单中'}</figcaption>
        </figure>
      </div>
    </div>
  );
}

