import { useEffect, useState } from 'react';
import { fetchWecomConfig, saveWecomConfig } from '../api/wecom.js';
import { useLanguage } from '../context/LanguageContext.jsx';

const DEFAULT_FORM = {
  enabled: false,
  webhookUrl: '',
  mentions: '',
};

export default function EnterpriseWeChatPanel() {
  const { language } = useLanguage();
  const isEnglish = language === 'en';
  const [form, setForm] = useState(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      setLoading(true);
      setStatus('');
      try {
        const data = await fetchWecomConfig();
        if (ignore) {
          return;
        }
        setForm({
          enabled: Boolean(data.enabled),
          webhookUrl: data.webhookUrl || '',
          mentions: (data.mentions || []).join('\n'),
        });
      } catch (err) {
        if (!ignore) {
          setStatus(err.message || (isEnglish ? 'Failed to load Enterprise WeChat settings.' : '无法加载企业微信配置。'));
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
  }, [isEnglish]);

  const handleChange = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus('');
    setLoading(true);
    try {
      const mentions = form.mentions
        .split(/[\s,]+/)
        .map((item) => item.trim())
        .filter(Boolean);
      const payload = {
        enabled: Boolean(form.enabled),
        webhookUrl: form.webhookUrl.trim() || null,
        mentions,
      };
      const record = await saveWecomConfig(payload);
      setForm({
        enabled: Boolean(record.enabled),
        webhookUrl: record.webhookUrl || '',
        mentions: (record.mentions || []).join('\n'),
      });
      setStatus(isEnglish ? 'Enterprise WeChat settings saved.' : '企业微信配置已保存。');
    } catch (err) {
      setStatus(err.message || (isEnglish ? 'Save failed, please retry later.' : '保存失败，请稍后重试。'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="dashboard__section enterprise-wechat">
      <div className="monitor-config__header">
        <div>
          <h2>{isEnglish ? 'Enterprise WeChat Alerts' : '企业微信推送'}</h2>
          <p>
            {isEnglish
              ? 'Push monitoring notifications via Enterprise WeChat. Use a custom bot webhook to receive alerts inside your workspace.'
              : '通过企业微信机器人推送监控提醒，方便在企业内部消息中及时知晓持仓动态。'}
          </p>
        </div>
        {status ? <div className="monitor-config__status">{status}</div> : null}
      </div>

      <form className="monitor-config__form" onSubmit={handleSubmit}>
        <div className="monitor-config__fieldset">
          <span className="monitor-config__legend">{isEnglish ? 'Webhook Settings' : 'Webhook 配置'}</span>
          <label className="monitor-config__field monitor-config__field--inline">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={handleChange('enabled')}
              disabled={loading}
            />
            <span>{isEnglish ? 'Enable Enterprise WeChat notifications' : '启用企业微信推送'}</span>
          </label>

          <label className="monitor-config__field">
            <span>{isEnglish ? 'Webhook URL' : 'Webhook 地址'}</span>
            <input
              type="text"
              value={form.webhookUrl}
              onChange={handleChange('webhookUrl')}
              placeholder={isEnglish ? 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?...' : 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?...'}
              disabled={loading}
            />
            <small>
              {isEnglish
                ? 'Create an Enterprise WeChat bot and copy the webhook address here. Messages are only sent when enabled.'
                : '在企业微信中添加群机器人，并将生成的 webhook 地址粘贴至此。启用后将推送监控消息。'}
            </small>
          </label>
        </div>

        <div className="monitor-config__fieldset">
          <span className="monitor-config__legend">{isEnglish ? 'Mentions' : '提醒对象'}</span>
          <label className="monitor-config__field">
            <span>{isEnglish ? 'Mobile numbers to @mention (optional)' : '需 @ 的手机号（可选）'}</span>
            <textarea
              rows={4}
              value={form.mentions}
              onChange={handleChange('mentions')}
              placeholder={isEnglish ? 'Separate multiple numbers with comma or newline' : '多个手机号可用逗号或换行分隔'}
              disabled={loading}
            />
          </label>
        </div>

        <div className="monitor-config__actions">
          <button type="submit" disabled={loading}>
            {loading ? (isEnglish ? 'Processing…' : '处理中…') : isEnglish ? 'Save' : '保存配置'}
          </button>
          <p className="monitor-config__hint">
            {isEnglish
              ? 'Messages will be delivered in Chinese or English according to the monitoring language.'
              : '推送消息的语言将随监控语言设置自动切换。'}
          </p>
        </div>
      </form>
    </section>
  );
}

