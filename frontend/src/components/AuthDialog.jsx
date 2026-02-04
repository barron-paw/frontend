import { useEffect, useState } from 'react';
import './AuthDialog.css';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { requestVerificationCode, forgotPassword, resetPassword } from '../api/auth.js';

export default function AuthDialog({ open, mode = 'login', onClose, onSwitch }) {
  const { login, register, error } = useAuth();
  const { language } = useLanguage();
  const isEnglish = language === 'en';

  const [form, setForm] = useState({ email: '', password: '', verificationCode: '', newPassword: '', inviteCode: '' });
  const [submitting, setSubmitting] = useState(false);
  const [requestingCode, setRequestingCode] = useState(false);
  const [localError, setLocalError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (!open) {
      setForm({ email: '', password: '', verificationCode: '', newPassword: '', inviteCode: '' });
      setLocalError('');
      setSuccessMessage('');
      setRequestingCode(false);
    }
  }, [open, mode]);

  if (!open) {
    return null;
  }

  const metadata = mode === 'register'
    ? {
        title: isEnglish ? 'Create Account' : '注册账号',
        submitText: isEnglish ? 'Register & Start 3-Day Trial' : '注册并开始 3 天试用',
        switchText: isEnglish ? 'Already have an account? Sign in' : '已有账号？点此登录',
        target: 'login',
      }
    : mode === 'forgot-password'
    ? {
        title: isEnglish ? 'Reset Password' : '找回密码',
        submitText: isEnglish ? 'Reset Password' : '重置密码',
        switchText: isEnglish ? 'Back to Sign In' : '返回登录',
        target: 'login',
      }
    : {
        title: isEnglish ? 'Sign In' : '登录账号',
        submitText: isEnglish ? 'Sign In' : '登录',
        switchText: isEnglish ? 'No account? Register' : '没有账号？点此注册',
        target: 'register',
      };

  const handleRequestVerification = async () => {
    // 防止重复请求
    if (requestingCode) {
      return;
    }
    
    const email = form.email.trim();
    if (!email) {
      setLocalError(isEnglish ? 'Please enter your email first.' : '请先填写邮箱。');
      return;
    }
    
    setLocalError('');
    setSuccessMessage('');
    setRequestingCode(true);
    try {
      if (mode === 'forgot-password') {
        await forgotPassword({ email });
        setSuccessMessage(isEnglish ? 'If the email exists, a password reset code has been sent. Please check your inbox.' : '如果邮箱存在，密码重置验证码已发送，请查收邮箱。');
      } else {
        await requestVerificationCode({ email });
        setSuccessMessage(isEnglish ? 'Verification code sent. Please check your inbox.' : '验证码已发送，请查收邮箱。');
      }
    } catch (err) {
      const status = err.response?.status;
      let msg = err.message || (isEnglish ? 'Failed to send verification code.' : '验证码发送失败。');
      // 429：60 秒内只能请求一次，提示中文并建议先查收上一封邮件
      if (status === 429) {
        msg = isEnglish
          ? 'Please wait about 1 minute before requesting again. If you already clicked once, check your inbox (and spam folder) for the code.'
          : '请约 1 分钟后再点击获取验证码。若您刚才已点击过，请先查收邮箱（含垃圾箱）里的验证码。';
      } else if (status >= 500) {
        msg = isEnglish ? 'Server error. Please try again later.' : '服务器错误，请稍后重试。';
      } else if (msg.includes('无法连接') || msg.includes('Failed to fetch')) {
        msg = isEnglish
          ? 'Request failed. If you already clicked "Get Code" once, check your inbox (and spam) for the code, then wait ~1 min before trying again.'
          : '请求未成功。若您刚才已点击过「获取验证码」，请先查收邮箱（含垃圾箱），约 1 分钟后再试。';
      }
      setLocalError(msg);
    } finally {
      setRequestingCode(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLocalError('');
    setSuccessMessage('');
    
    if (mode === 'forgot-password') {
      if (!form.email || !form.verificationCode.trim() || !form.newPassword) {
        setLocalError(isEnglish ? 'Email, verification code, and new password are required.' : '邮箱、验证码和新密码不能为空。');
        return;
      }
      if (form.newPassword.length < 6) {
        setLocalError(isEnglish ? 'Password must be at least 6 characters long.' : '密码长度至少为6位。');
        return;
      }
      try {
        setSubmitting(true);
        await resetPassword({
          email: form.email,
          verificationCode: form.verificationCode.trim(),
          newPassword: form.newPassword,
        });
        setSuccessMessage(isEnglish ? 'Password reset successfully! You can now sign in with your new password.' : '密码重置成功！您现在可以使用新密码登录。');
        // 3秒后自动切换到登录界面
        setTimeout(() => {
          onSwitch('login');
          setForm({ email: form.email, password: '', verificationCode: '', newPassword: '', inviteCode: '' });
        }, 3000);
      } catch (err) {
        setLocalError(err.message || (isEnglish ? 'Password reset failed, please retry later.' : '密码重置失败，请稍后再试'));
      } finally {
        setSubmitting(false);
      }
      return;
    }
    
    if (!form.email || !form.password) {
      setLocalError(isEnglish ? 'Email and password are required.' : '邮箱和密码不能为空。');
      return;
    }
    try {
      setSubmitting(true);
      if (mode === 'login') {
        await login({ email: form.email, password: form.password });
        onClose();
      } else {
        if (!form.verificationCode.trim()) {
          setLocalError(isEnglish ? 'Verification code is required.' : '请输入邮箱验证码。');
          setSubmitting(false);
          return;
        }
        await register({
          email: form.email,
          password: form.password,
          verification_code: form.verificationCode.trim(),
          invite_code: form.inviteCode.trim() || undefined,
        });
        onClose();
      }
    } catch (err) {
      // 记录详细错误信息用于调试
      console.error('[AuthDialog] Login/Register error:', err);
      const status = err.response?.status;
      let errorMessage = err.message || (isEnglish ? 'Action failed, please retry later.' : '操作失败，请稍后再试');
      // 5xx：服务器内部错误，与「无法连接」区分开
      if (status >= 500) {
        errorMessage = isEnglish
          ? 'Server error. Please try again later or contact support.'
          : '服务器错误，请稍后重试。若持续出现请联系管理员。';
      } else if (errorMessage.includes('无法连接到服务器') || errorMessage.includes('Failed to fetch') || errorMessage.includes('Load failed')) {
        const isIOSDevice = typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent);
        if (!isIOSDevice) {
          errorMessage = isEnglish
            ? 'Unable to connect to server. Please check your network connection and try again.'
            : '无法连接到服务器，请检查网络连接后重试。';
        }
      }
      setLocalError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-dialog__backdrop" role="dialog" aria-modal="true">
      <div className="auth-dialog__panel">
        <div className="auth-dialog__header">
          <h2>{metadata.title}</h2>
          <button type="button" className="auth-dialog__close" onClick={onClose}>
            ×
          </button>
        </div>
        <form className="auth-dialog__form" onSubmit={handleSubmit}>
          <label className="auth-dialog__field">
            <span>{isEnglish ? 'Email' : '邮箱'}</span>
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              required
            />
          </label>
          {mode !== 'forgot-password' && (
            <label className="auth-dialog__field">
              <span>{isEnglish ? 'Password' : '密码'}</span>
              <input
                type="password"
                value={form.password}
                onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                minLength={6}
                required
              />
            </label>
          )}
          {mode === 'forgot-password' && (
            <label className="auth-dialog__field">
              <span>{isEnglish ? 'New Password' : '新密码'}</span>
              <input
                type="password"
                value={form.newPassword}
                onChange={(event) => setForm((prev) => ({ ...prev, newPassword: event.target.value }))}
                minLength={6}
                required
                placeholder={isEnglish ? 'At least 6 characters' : '至少6个字符'}
              />
            </label>
          )}
          {(mode === 'register' || mode === 'forgot-password') ? (
            <label className="auth-dialog__field">
              <span>{isEnglish ? 'Verification Code' : '验证码'}</span>
              <div className="auth-dialog__code-row">
                <input
                  type="text"
                  value={form.verificationCode}
                  onChange={(event) => setForm((prev) => ({ ...prev, verificationCode: event.target.value }))}
                />
                <button type="button" onClick={handleRequestVerification} disabled={submitting || requestingCode}>
                  {requestingCode ? (isEnglish ? 'Sending…' : '发送中…') : (isEnglish ? 'Send Code' : '获取验证码')}
                </button>
              </div>
            </label>
          ) : null}
          {mode === 'register' && (
            <label className="auth-dialog__field">
              <span>{isEnglish ? 'Invite Code (Optional)' : '邀请码（选填）'}</span>
              <input
                type="text"
                value={form.inviteCode}
                onChange={(event) => {
                  // 自动转换为大写，只允许字母和数字
                  const value = event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
                  setForm((prev) => ({ ...prev, inviteCode: value }));
                }}
                placeholder={isEnglish ? 'Enter invite code' : '请输入邀请码'}
                maxLength={8}
              />
            </label>
          )}

          {successMessage ? <div className="auth-dialog__success">{successMessage}</div> : null}
          {(localError || error) ? (
            <div className="auth-dialog__error" style={{ whiteSpace: 'pre-line' }}>
              {localError || error}
            </div>
          ) : null}

          <button type="submit" className="auth-dialog__submit" disabled={submitting}>
            {submitting ? (isEnglish ? 'Submitting…' : '提交中…') : metadata.submitText}
          </button>
        </form>
        <div className="auth-dialog__switch">
          {mode === 'login' && (
            <>
              <button type="button" onClick={() => onSwitch('forgot-password')} style={{ marginRight: '16px', color: 'var(--accent-primary, #5b7cfa)' }}>
                {isEnglish ? 'Forgot Password?' : '忘记密码？'}
              </button>
              <button type="button" onClick={() => onSwitch(metadata.target)}>
                {metadata.switchText}
              </button>
            </>
          )}
          {mode !== 'login' && (
            <button type="button" onClick={() => onSwitch(metadata.target)}>
              {metadata.switchText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
