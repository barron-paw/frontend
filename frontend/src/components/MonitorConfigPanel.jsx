
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { fetchMonitorConfig, updateMonitorConfig, fetchTelegramChatId, getTelegramVerificationCode } from '../api/config.js';
import { fetchWecomConfig, saveWecomConfig } from '../api/wecom.js';
import { useLanguage } from '../context/LanguageContext.jsx';
import { fetchCurrentUser } from '../api/auth.js';

export default function MonitorConfigPanel() {
  const { user } = useAuth();
  const { language, setLanguage } = useLanguage();
  const isEnglish = language === 'en';
  const [form, setForm] = useState({
    telegramChatId: '',
    walletAddresses: [], // 改为数组
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
  const [lastSaveTime, setLastSaveTime] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [previousWalletAddresses, setPreviousWalletAddresses] = useState([]); // 保存上一次的钱包地址，用于检测替换逻辑
  const [currentMonitoredAddresses, setCurrentMonitoredAddresses] = useState([]); // 保存后端实际监控的地址，用于显示"当前监控"
  const [previousTelegramChatId, setPreviousTelegramChatId] = useState(''); // 保存之前加载的 telegram_chat_id，用于在用户勾选但未填写时保留

  const canEdit = user?.can_access_monitor;

  useEffect(() => {
    const loadConfig = async () => {
      if (!canEdit) {
        return;
      }
      // 重要：切换账户时，清除旧数据，确保显示新账户的数据
      setForm({
        telegramChatId: '',
        walletAddresses: [],
        language: 'zh',
        telegramEnabled: true,
        wecomEnabled: false,
        wecomWebhookUrl: '',
        wecomMentions: '',
      });
      setCurrentMonitoredAddresses([]);
      setPreviousWalletAddresses([]);
      setLoading(true);
      try {
        // 强制不使用缓存，确保获取最新数据
        // 注意：WeCom 配置是可选的，如果获取失败应该静默处理，不显示错误
        const [monitorData, wecomData] = await Promise.all([
          fetchMonitorConfig(),
          fetchWecomConfig().catch((err) => {
            // WeCom 配置获取失败时静默处理，不显示错误（因为 WeCom 是可选的）
            console.debug('[MonitorConfigPanel] WeCom config fetch failed (optional), using defaults:', err);
            return { enabled: false, webhookUrl: '', mentions: [] };
          }),
        ]);
        
        // 调试日志：确保移动端和桌面端获取到相同的数据
        console.log('[MonitorConfigPanel] Loaded config:', {
          usesDefaultBot: monitorData.usesDefaultBot,
          defaultBotUsername: monitorData.defaultBotUsername,
          telegramChatId: monitorData.telegramChatId ? '***' : null,
          language: monitorData.language,
          userAgent: navigator.userAgent,
          isMobile: /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent),
          rawUsesDefaultBot: monitorData.usesDefaultBot,
          rawDefaultBotUsername: monitorData.defaultBotUsername,
        });
        
        const loadedAddresses = (monitorData.walletAddresses || []).slice(0, 2);
        // 重要：monitorData.walletAddresses 是后端实际监控的地址（从运行中的监控线程获取）
        // 这个地址用于显示"当前监控"，而不是用于输入框
        setCurrentMonitoredAddresses(loadedAddresses);
        const loadedTelegramChatId = monitorData.telegramChatId || '';
        setForm({
          telegramChatId: loadedTelegramChatId,
          walletAddresses: loadedAddresses, // 改为数组，最多2个（用于输入框显示）
          language: monitorData.language || 'zh',
          telegramEnabled: Boolean(monitorData.telegramChatId),
          wecomEnabled: Boolean(wecomData.enabled),
          wecomWebhookUrl: wecomData.webhookUrl || '',
          wecomMentions: (wecomData.mentions || []).join('\n'),
        });
        // 保存之前加载的 telegram_chat_id，用于在用户勾选但未填写时保留
        setPreviousTelegramChatId(loadedTelegramChatId);
        // 保存加载的地址，用于检测替换逻辑
        setPreviousWalletAddresses(loadedAddresses);
        setLanguage(monitorData.language || 'zh');
        // 确保布尔值转换正确，处理各种可能的类型
        const usesDefault = Boolean(monitorData.usesDefaultBot === true || monitorData.usesDefaultBot === 'true' || monitorData.usesDefaultBot === 1);
        const defaultUsername = String(monitorData.defaultBotUsername || '').trim();
        setUsesDefaultBot(usesDefault);
        setDefaultBotUsername(defaultUsername);
        
        console.log('[MonitorConfigPanel] Set state:', {
          usesDefaultBot: usesDefault,
          defaultBotUsername: defaultUsername,
          originalUsesDefaultBot: monitorData.usesDefaultBot,
          originalDefaultBotUsername: monitorData.defaultBotUsername,
        });
      } catch (err) {
        console.error('Failed to load monitor config:', err);
        // 如果错误消息包含 WeCom 相关的 URL，说明只是 WeCom 配置获取失败
        // 这不应该显示错误，因为 WeCom 是可选的，且后端可能正常工作
        const errorMessage = err.message || '';
        if (errorMessage.includes('/wecom') || errorMessage.includes('wecom') || errorMessage.includes('无法连接到服务器')) {
          // WeCom 配置获取失败，但不影响监控配置，静默处理
          // 注意：如果错误消息是"无法连接到服务器"，可能是 WeCom 配置获取失败导致的
          // 这种情况下，如果监控配置已经成功加载，不应该显示错误
          console.debug('[MonitorConfigPanel] WeCom config fetch failed in catch block (optional), ignoring:', err);
          // 不设置错误状态，因为 WeCom 是可选的
        } else {
          // 其他错误（如监控配置获取失败），显示错误
          setStatus(isEnglish ? errorMessage || 'Failed to load monitor configuration' : errorMessage || '无法加载监控配置');
        }
      } finally {
        setLoading(false);
      }
    };
    loadConfig();
  }, [canEdit, user?.id]); // 当 canEdit 或 user.id 改变时重新加载（切换账户时 user.id 会改变）


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
    
    // 防抖：5秒内不能重复点击（在刷新用户信息之前检查，避免重复刷新）
    const now = Date.now();
    const timeSinceLastSave = now - lastSaveTime;
    if (timeSinceLastSave < 5000 && lastSaveTime > 0) {
      const remainingSeconds = Math.ceil((5000 - timeSinceLastSave) / 1000);
      setStatus(isEnglish 
        ? `Please wait ${remainingSeconds} second(s) before saving again.` 
        : `请等待 ${remainingSeconds} 秒后再保存。`);
      return;
    }
    
    // 如果正在保存，直接返回
    if (isSaving) {
      return;
    }
    
    // 立即设置保存状态，禁用按钮，避免重复点击
    setStatus('');
    setIsSaving(true);
    setLoading(true);
    
    // 重要：在保存前，先刷新用户信息，确保订阅状态是最新的
    // 这样可以避免因为缓存导致的订阅状态错误
    let refreshedUser = user;
    try {
      // 快速刷新用户信息（设置超时，避免等待太久）
      refreshedUser = await Promise.race([
        fetchCurrentUser(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
      ]);
      console.log('[MonitorConfigPanel] 保存前刷新用户信息:', {
        old_can_access_monitor: user?.can_access_monitor,
        new_can_access_monitor: refreshedUser?.can_access_monitor,
        subscription_active: refreshedUser?.subscription_active,
        trial_active: refreshedUser?.trial_active,
        subscription_end: refreshedUser?.subscription_end,
        user_id: refreshedUser?.email,
      });
      
      // 更新 AuthContext 中的用户信息（如果 refreshUser 可用）
      if (refreshedUser && refreshUser) {
        try {
          refreshUser();
        } catch (refreshErr) {
          console.warn('[MonitorConfigPanel] 更新 AuthContext 失败（不影响保存）:', refreshErr);
        }
      }
      
      // 重新获取最新的 canEdit 状态
      if (!refreshedUser?.can_access_monitor) {
        setStatus(isEnglish 
          ? 'Subscription or trial expired. Please renew to continue using monitoring features.' 
          : '订阅或试用已过期。请续费后继续使用监控功能。');
        setIsSaving(false);
        setLoading(false);
        return;
      }
    } catch (err) {
      console.warn('[MonitorConfigPanel] 刷新用户信息失败（使用缓存状态）:', err);
      // 如果刷新失败，使用当前的 user 状态（不阻止保存）
      if (!user?.can_access_monitor) {
        setStatus(isEnglish 
          ? 'Unable to verify subscription status. Please refresh the page and try again.' 
          : '无法验证订阅状态。请刷新页面后重试。');
        setIsSaving(false);
        setLoading(false);
        return;
      }
      // 如果当前用户状态有效，继续保存（使用缓存的用户信息）
      refreshedUser = user;
    }
    
    if (!canEdit && !refreshedUser?.can_access_monitor) {
      setIsSaving(false);
      setLoading(false);
      return;
    }
    
    try {
      // Save monitor config
      // 影响是否发送快照、是否继续监控的，只取决于新的钱包变化
      // 如果新的配置为空（钱包地址为空），就不再推送，停止监控
      // 互斥逻辑：
      // - 如果只勾选微信，停掉所有tg推送（但保留 chat_id，用户下次启用时不需要重新填写）
      // - 如果只勾选 Telegram，企业微信会被后端停用（但保留 webhook_url，用户下次启用时不需要重新填写）
      // - 如果两个都勾选，两个都推送
      // Telegram 勾选与否只影响是否推送：
      // - 如果勾选 Telegram，则把 chat_id 发送给后端，启用 Telegram 推送
      // - 如果没有勾选 Telegram，则不把 chat_id 发送给后端（但前端仍保留输入内容，下次勾选时直接生效）
      // 重要：如果用户勾选了 Telegram，但没有填写 chat_id，应该保留数据库中已有的值
      // 只有当用户明确清空输入框（从有值变为空）时，才发送 null
      let telegramChatIdValue = null;
      if (form.telegramEnabled) {
        // 用户勾选了 Telegram
        if (form.telegramChatId.trim()) {
          // 用户填写了 chat_id，使用用户填写的值
          telegramChatIdValue = form.telegramChatId.trim();
        } else {
          // 用户勾选了但没有填写 chat_id
          // 如果之前有保存的值，使用之前的值（保留原有配置）
          // 如果之前没有值，则为 null（禁用 Telegram）
          if (previousTelegramChatId && previousTelegramChatId.trim()) {
            telegramChatIdValue = previousTelegramChatId.trim();
            console.log('[MonitorConfigPanel] 用户勾选了 Telegram 但未填写 chat_id，使用之前保存的值:', telegramChatIdValue);
          } else {
            telegramChatIdValue = null;
            console.log('[MonitorConfigPanel] 用户勾选了 Telegram 但未填写 chat_id，且之前没有保存的值，禁用 Telegram');
          }
        }
      } else {
        // 用户没有勾选 Telegram，发送 null 以禁用
        telegramChatIdValue = null;
      }
      // 处理钱包地址数组：去除空值，去重（相同地址自动合并为一个），最多2个
      const walletAddressesList = form.walletAddresses
        .map((addr) => addr.trim())
        .filter(Boolean)
        .filter((addr, index, self) => {
          // 去重：保留第一次出现的地址（不区分大小写）
          return self.findIndex(a => a.toLowerCase() === addr.toLowerCase()) === index;
        })
        .slice(0, 2);
      
      // 如果用户输入了2个相同地址，自动合并为一个（只保留一个）
      // 这个检查已经在上面通过去重逻辑处理了，但这里添加日志以便调试
      const uniqueAddresses = new Set(walletAddressesList.map(addr => addr.toLowerCase()));
      if (uniqueAddresses.size < form.walletAddresses.filter(Boolean).length) {
        console.log('[MonitorConfigPanel] 检测到相同地址，已自动合并为一个', {
          original: form.walletAddresses.filter(Boolean),
          merged: walletAddressesList,
        });
      }
      
      // 实现替换逻辑：
      // 1. 如果之前有2个地址，现在只填写1个新地址，保留第二个地址，替换第一个地址
      // 2. 如果之前有1个地址，现在只填写1个新地址，保留原有地址，添加新地址（变成2个地址）
      const previousCount = previousWalletAddresses.length;
      const currentCount = walletAddressesList.length;
      const previousAddressesSet = new Set(previousWalletAddresses.map(addr => addr.trim().toLowerCase()));
      const currentAddressesSet = new Set(walletAddressesList.map(addr => addr.trim().toLowerCase()));
      
      // 检测是否是替换场景：之前有2个地址，现在只填写1个新地址（且这个新地址不在之前的地址中）
      const isReplacement = previousCount === 2 && currentCount === 1 && 
                            !currentAddressesSet.has(previousWalletAddresses[0]?.trim().toLowerCase()) &&
                            !currentAddressesSet.has(previousWalletAddresses[1]?.trim().toLowerCase());
      
      // 检测是否是保留场景：之前有2个地址，现在只填写1个地址，但这个地址已经在之前的监控列表中
      const isKeepExisting = previousCount === 2 && currentCount === 1 && 
                             (currentAddressesSet.has(previousWalletAddresses[0]?.trim().toLowerCase()) ||
                              currentAddressesSet.has(previousWalletAddresses[1]?.trim().toLowerCase()));
      
      // 检测是否是添加场景：
      // 1. 之前有1个地址，现在只填写1个新地址（且这个新地址不在之前的地址中）
      // 2. 之前有1个地址，现在填写2个地址（包含原有地址和新地址）
      const isAddNew = previousCount === 1 && currentCount === 1 && 
                       !currentAddressesSet.has(previousWalletAddresses[0]?.trim().toLowerCase());
      
      // 检测是否是添加场景（填写2个地址，包含原有地址）
      const isAddNewWithTwo = previousCount === 1 && currentCount === 2 && 
                              currentAddressesSet.has(previousWalletAddresses[0]?.trim().toLowerCase());
      
      let finalWalletAddresses = walletAddressesList;
      
      // 如果检测到替换逻辑，实现替换：保留第二个地址，替换第一个地址
      if (isReplacement) {
        const newAddress = walletAddressesList[0];
        const secondAddress = previousWalletAddresses[1]; // 保留第二个地址
        finalWalletAddresses = [secondAddress, newAddress]; // 结果是 [B, C]
        console.log('[MonitorConfigPanel] 替换逻辑：之前有2个地址，现在只填写1个新地址，保留第二个地址，替换第一个地址', {
          previousAddresses: previousWalletAddresses,
          newAddress: newAddress,
          finalWalletAddresses: finalWalletAddresses,
        });
      } else if (isKeepExisting) {
        // 如果之前有2个地址，现在只填写1个地址，但这个地址已经在之前的监控列表中
        // 保留原有的监控列表，不改变（因为用户可能只是想确认配置，而不是要改变监控列表）
        finalWalletAddresses = previousWalletAddresses;
        console.log('[MonitorConfigPanel] 保留逻辑：之前有2个地址，现在只填写1个已存在的地址，保留原有监控列表', {
          previousAddresses: previousWalletAddresses,
          userInput: walletAddressesList,
          finalWalletAddresses: finalWalletAddresses,
        });
      } else if (isAddNew) {
        // 如果之前有1个地址，现在只填写1个新地址，保留原有地址，添加新地址
        const existingAddress = previousWalletAddresses[0];
        const newAddress = walletAddressesList[0];
        finalWalletAddresses = [existingAddress, newAddress]; // 结果是 [A, B]
        console.log('[MonitorConfigPanel] 添加逻辑：之前有1个地址，现在只填写1个新地址，保留原有地址，添加新地址', {
          previousAddresses: previousWalletAddresses,
          newAddress: newAddress,
          finalWalletAddresses: finalWalletAddresses,
        });
      } else if (isAddNewWithTwo) {
        // 如果之前有1个地址，现在填写2个地址（包含原有地址），直接使用用户填写的地址
        // 确保原有地址在前，新地址在后（保持顺序）
        const existingAddress = previousWalletAddresses[0];
        const existingIndex = walletAddressesList.findIndex(addr => 
          addr.trim().toLowerCase() === existingAddress.trim().toLowerCase()
        );
        if (existingIndex === 0) {
          // 原有地址在第一位，直接使用
          finalWalletAddresses = walletAddressesList;
        } else {
          // 原有地址不在第一位，调整顺序：原有地址在前，新地址在后
          const newAddress = walletAddressesList.find(addr => 
            addr.trim().toLowerCase() !== existingAddress.trim().toLowerCase()
          );
          finalWalletAddresses = [existingAddress, newAddress].filter(Boolean);
        }
        console.log('[MonitorConfigPanel] 添加逻辑：之前有1个地址，现在填写2个地址（包含原有地址），保留原有地址，添加新地址', {
          previousAddresses: previousWalletAddresses,
          userInput: walletAddressesList,
          finalWalletAddresses: finalWalletAddresses,
        });
      }
      
      // 允许空列表保存（用于停止监控）
      // 重要：检查用户是否真的清空了所有输入框
      // 如果 form.walletAddresses 中所有地址都是空的，说明用户主动清空了地址，应该发送空列表
      // 如果 finalWalletAddresses 为空，但 form.walletAddresses 中有非空地址，说明可能是去重后变空了，应该保留原有地址
      const allInputsEmpty = form.walletAddresses.every(addr => !addr || !addr.trim());
      if (finalWalletAddresses.length === 0 && previousWalletAddresses.length > 0 && !allInputsEmpty) {
        // 用户没有清空所有输入框，但去重后变空了（例如输入了重复地址），保留原有地址
        finalWalletAddresses = previousWalletAddresses;
        console.log('[MonitorConfigPanel] 输入框未全部清空，但去重后变空，保留原有地址', {
          formWalletAddresses: form.walletAddresses,
          previousWalletAddresses: previousWalletAddresses,
        });
      } else if (allInputsEmpty) {
        // 用户主动清空了所有输入框，发送空列表以停止监控
        finalWalletAddresses = [];
        console.log('[MonitorConfigPanel] 用户主动清空所有地址，发送空列表以停止监控', {
          formWalletAddresses: form.walletAddresses,
        });
      }
      
      // 确保最多只发送2个钱包地址（即使前端被绕过，也要限制）
      const limitedWalletAddresses = finalWalletAddresses.slice(0, 2);
      if (finalWalletAddresses.length > 2) {
        console.warn('[MonitorConfigPanel] 钱包地址数量超过2个，已限制为前2个:', {
          original: finalWalletAddresses,
          limited: limitedWalletAddresses,
        });
      }
      
      console.log('[MonitorConfigPanel] 保存配置:', {
        walletAddressesList,
        previousWalletAddresses,
        finalWalletAddresses,
        limitedWalletAddresses,
        language: form.language,
        formWalletAddresses: form.walletAddresses,
        allInputsEmpty: form.walletAddresses.every(addr => !addr || !addr.trim()),
      });
      
      // 验证：确保至少有一个有效地址
      if (limitedWalletAddresses.length === 0 && form.walletAddresses.some(addr => addr && addr.trim())) {
        console.warn('[MonitorConfigPanel] 警告：用户输入了地址，但处理后地址列表为空，可能是地址格式错误或重复', {
          formWalletAddresses: form.walletAddresses,
          limitedWalletAddresses,
        });
        setStatus(isEnglish 
          ? 'Warning: Invalid wallet address format. Please check that addresses start with 0x and are 42 characters long.' 
          : '警告：钱包地址格式错误。请确保地址以 0x 开头且长度为 42 个字符。');
        setLoading(false);
        setIsSaving(false);
        return;
      }
      
      const monitorPayload = {
        telegramChatId: telegramChatIdValue,
        walletAddresses: limitedWalletAddresses,
        language: form.language,
      };
      const monitorResponse = await updateMonitorConfig(monitorPayload);
      
      // 使用后端返回的实际监控地址（从运行中的监控线程获取）
      // 这是后端实际正在监控的地址，用于显示"当前监控"
      const savedAddresses = (monitorResponse.walletAddresses || []).slice(0, 2);
      
      // 更新"当前监控"显示的地址（使用后端返回的实际监控地址）
      setCurrentMonitoredAddresses(savedAddresses);
      
      // 更新上一次的钱包地址（使用后端返回的实际监控地址，用于检测替换逻辑）
      setPreviousWalletAddresses(savedAddresses);
      
      // 如果钱包地址为空，提示监控已停止
      if (finalWalletAddresses.length === 0 || savedAddresses.length === 0) {
        setStatus(isEnglish 
          ? 'Configuration saved. Monitoring has been stopped (no wallet addresses).'
          : '配置已保存。监控已停止（钱包地址列表为空）。');
      } else if (isReplacement) {
        // 如果是替换逻辑，提示用户
        setStatus(isEnglish 
          ? `Configuration saved. The first wallet has been replaced. Currently monitoring: ${savedAddresses.join(', ')}`
          : `配置已保存。第一个钱包已被替换。当前监控：${savedAddresses.join(', ')}`);
      } else if (isKeepExisting) {
        // 如果是保留逻辑，提示用户
        setStatus(isEnglish 
          ? `Configuration saved. The existing monitoring list has been preserved. Currently monitoring: ${savedAddresses.join(', ')}`
          : `配置已保存。已保留原有监控列表。当前监控：${savedAddresses.join(', ')}`);
      } else {
        setStatus(isEnglish 
          ? 'Configuration saved successfully.'
          : '配置已保存成功。');
      }
      
      // Save WeCom config
      // 处理手机号：去除 @ 符号，只保留数字
      const mentions = form.wecomMentions
        .split(/[\s,]+/)
        .map((item) => item.trim().replace(/^@+/, '')) // 去除开头的 @ 符号
        .filter((item) => item && /^\d+$/.test(item)); // 只保留纯数字
      // 调试：检查表单状态和输入框的实际值
      // 尝试多种选择器来找到输入框
      const webhookInputElement = document.querySelector('input[type="text"][placeholder*="webhook"]') 
        || document.querySelector('input[placeholder*="qyapi.weixin.qq.com"]')
        || Array.from(document.querySelectorAll('input[type="text"]')).find(input => 
            input.placeholder && input.placeholder.includes('webhook')
          );
      const webhookInputValue = webhookInputElement?.value || '';
      console.log('[MonitorConfigPanel] Before saving WeCom config - form state:', {
        wecomEnabled: form.wecomEnabled,
        wecomWebhookUrl: form.wecomWebhookUrl,
        wecomWebhookUrlLength: form.wecomWebhookUrl?.length,
        wecomWebhookUrlTrimmed: form.wecomWebhookUrl?.trim(),
        wecomWebhookUrlTrimmedLength: form.wecomWebhookUrl?.trim()?.length,
        webhookInputElementFound: !!webhookInputElement,
        webhookInputElementValue: webhookInputValue,
        webhookInputElementValueLength: webhookInputValue?.length,
        webhookInputElementValueTrimmed: webhookInputValue?.trim(),
        webhookInputElementValueTrimmedLength: webhookInputValue?.trim()?.length,
      });
      
      // 重要：如果表单状态中的 webhookUrl 为空，但输入框有值，使用输入框的值
      // 这可以解决表单状态和输入框不同步的问题
      const effectiveWebhookUrl = (form.wecomWebhookUrl && form.wecomWebhookUrl.trim()) 
        ? form.wecomWebhookUrl 
        : (webhookInputValue && webhookInputValue.trim() ? webhookInputValue : '');
      
      console.log('[MonitorConfigPanel] Effective webhook URL:', {
        formValue: form.wecomWebhookUrl,
        inputValue: webhookInputValue,
        effectiveValue: effectiveWebhookUrl,
        willSend: effectiveWebhookUrl.trim() || null,
      });
      
      const wecomPayload = {
        enabled: form.wecomEnabled,  // 直接使用用户的选择，后端会根据 webhook_url 是否为空来决定是否真正启用
        webhookUrl: effectiveWebhookUrl.trim() || null,
        mentions,
      };
      console.log('Saving WeCom config:', wecomPayload); // 调试日志
      // 保存 WeCom 配置，如果失败则静默处理（因为 WeCom 是可选的）
      let wecomResponse = null;
      try {
        wecomResponse = await saveWecomConfig(wecomPayload);
        console.log('WeCom config saved:', wecomResponse); // 调试日志
      } catch (wecomErr) {
        // WeCom 配置保存失败时静默处理，不显示错误（因为 WeCom 是可选的）
        // 但记录日志以便调试
        console.warn('[MonitorConfigPanel] WeCom config save failed (optional), continuing:', wecomErr);
        // 使用默认值，确保后续代码不会出错
        wecomResponse = { enabled: false, webhookUrl: null, mentions: [] };
      }
      
      // 使用后端返回的实际监控地址，确保前端显示的地址与后端实际监控的地址一致
      // 确保 savedAddresses 是数组，且去重
      const finalAddresses = Array.isArray(savedAddresses) 
        ? savedAddresses.filter((addr, index, self) => 
            addr && self.findIndex(a => a.toLowerCase() === addr.toLowerCase()) === index
          ).slice(0, 2)
        : [];
      
      setForm((prev) => ({
        ...prev,
        telegramChatId: monitorResponse.telegramChatId || '',
        // 使用后端返回的实际监控地址（去重后）
        walletAddresses: finalAddresses,
        language: monitorResponse.language || 'zh',
        // 保持用户的选择，不要因为后端返回了 chat_id 就自动勾选
        telegramEnabled: prev.telegramEnabled, // 保持用户的选择，不自动勾选
        // 保持用户的选择，不要因为后端返回了 enabled 就自动勾选
        wecomEnabled: prev.wecomEnabled, // 保持用户的选择，不自动勾选
        // 重要：如果用户输入了 webhookUrl，保留用户输入的值；否则使用后端返回的值
        // 这样可以避免后端返回 null 时覆盖用户输入
        wecomWebhookUrl: (prev.wecomWebhookUrl && prev.wecomWebhookUrl.trim()) 
          ? prev.wecomWebhookUrl 
          : (wecomResponse.webhookUrl || ''),
        wecomMentions: (wecomResponse.mentions || []).join('\n'),
      }));
      // 更新 previousWalletAddresses 为最终保存的地址
      setPreviousWalletAddresses(finalAddresses);
      setLanguage(monitorResponse.language || 'zh');
      // 确保布尔值转换正确，处理各种可能的类型
      const usesDefault = Boolean(monitorResponse.usesDefaultBot === true || monitorResponse.usesDefaultBot === 'true' || monitorResponse.usesDefaultBot === 1);
      const defaultUsername = String(monitorResponse.defaultBotUsername || '').trim();
      setUsesDefaultBot(usesDefault);
      setDefaultBotUsername(defaultUsername);
      console.log('[MonitorConfigPanel] After save - Set state:', {
        usesDefaultBot: usesDefault,
        defaultBotUsername: defaultUsername,
        originalUsesDefaultBot: monitorResponse.usesDefaultBot,
        originalDefaultBotUsername: monitorResponse.defaultBotUsername,
      });
      // 如果钱包地址不为空，显示保存成功消息（空列表的情况已在上面处理）
      if (walletAddressesList.length > 0) {
        setStatus(isEnglish ? 'Configuration saved.' : '配置已保存。');
      }
      // 请求成功后才设置 lastSaveTime，用于防抖
      setLastSaveTime(Date.now());
    } catch (err) {
      setStatus(err.message || (isEnglish ? 'Save failed, please retry later.' : '保存失败，请稍后重试'));
      // 请求失败时不设置 lastSaveTime，允许用户立即重试
    } finally {
      setLoading(false);
      setIsSaving(false);
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
                    onChange={(event) => {
                      const checked = event.target.checked;
                      setForm((prev) => ({
                        ...prev,
                        telegramEnabled: checked,
                        // 如果勾选 Telegram，取消企业微信（互斥逻辑）
                        // 如果两个都勾选，则两个都推送（允许同时勾选）
                        // 这里不自动取消，允许用户同时勾选两个
                      }));
                    }}
                    disabled={!canEdit || loading}
                  />
                  <span>{isEnglish ? 'Enable Telegram notifications' : '启用 Telegram 推送'}</span>
                </label>
                <label className="monitor-config__field monitor-config__field--inline">
              <input
                    type="checkbox"
                    checked={form.wecomEnabled}
                    onChange={(event) => {
                      const checked = event.target.checked;
                      setForm((prev) => ({
                        ...prev,
                        wecomEnabled: checked,
                        // 如果勾选企业微信，取消 Telegram（互斥逻辑）
                        // 如果两个都勾选，则两个都推送（允许同时勾选）
                        // 这里不自动取消，允许用户同时勾选两个
                      }));
                    }}
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

1. Click the "Get Code" button to generate a unique verification code.

2. Open Telegram and ${botHint}.

3. After sending the code, click the "Auto Get" button next to the Chat ID input field.

4. The system will automatically find your message containing the verification code and retrieve your Chat ID, then save it.

Note: Each user gets a unique verification code based on their account, so the system can correctly identify which chat_id belongs to you. The verification code is valid for 5 minutes.${botWarning}`
                          : `Telegram Chat ID 配置指南：

1. 点击「获取验证码」按钮生成一个唯一的验证码。

2. 打开 Telegram，${botHintZh}。

3. 发送验证码后，点击 Chat ID 输入框旁边的「自动获取」按钮。

4. 系统将自动找到包含验证码的消息，获取您的 Chat ID 并保存。

注意：每个用户都会获得基于其账户的唯一验证码，因此系统可以正确识别哪个 chat_id 属于您。验证码有效期为5分钟。${botWarningZh}`;
                        
                        // 添加时间戳参数避免缓存，确保加载最新图片
                        const cacheBuster = `?v=${Date.now()}`;
                        const images = [
                          `https://raw.githubusercontent.com/barron-paw/frontend/main/tg1.png${cacheBuster}`,
                          `https://raw.githubusercontent.com/barron-paw/frontend/main/tg2.png${cacheBuster}`,
                        ];
                        
                        const imageHtml = images.map((img, idx) => 
                          `<div style="margin: 10px 0;"><img src="${img}" alt="Step ${idx + 1}" style="max-width: 100%; border-radius: 4px;" /></div>`
                        ).join('');
                        
                        const fullContent = `
                          <div style="max-width: 600px; padding: 20px;">
                            <h3 style="margin-top: 0;">${isEnglish ? 'Telegram Chat ID Setup Guide' : 'Telegram Chat ID 配置指南'}</h3>
                            <div style="white-space: pre-line; margin-bottom: 20px; line-height: 1.8;">${guideContent}</div>
                            <div style="margin-top: 20px;">
                              ${imageHtml}
                            </div>
                            <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid rgba(255, 255, 255, 0.1); font-size: 0.85rem; color: #999;">
                              ${isEnglish ? 'Guide Version: 2024.11.17' : '指南版本：2024.11.17'}
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
                    {(() => {
                      // 调试日志：记录渲染时使用的值
                      const renderValues = {
                        usesDefaultBot,
                        defaultBotUsername,
                        isEnglish,
                        condition: usesDefaultBot && defaultBotUsername ? 'hasUsername' : usesDefaultBot ? 'hasDefaultBot' : 'noDefaultBot',
                      };
                      console.log('[MonitorConfigPanel] Rendering help text with:', renderValues);
                      return null;
                    })()}
                    {isEnglish ? (
                      <>
                        {usesDefaultBot && defaultBotUsername ? (
                          <>
                            Our default bot <strong>@{defaultBotUsername}</strong> is preconfigured. Click "Get Code" to generate a verification code, send it to <strong>@{defaultBotUsername}</strong> (NOT to @TelegramBotRaw), then click "Auto Get" to retrieve your Chat ID.
                          </>
                        ) : usesDefaultBot ? (
                          <>
                            Our default bot token is preconfigured. Click "Get Code" to generate a verification code, send it to your bot, then click "Auto Get" to retrieve your Chat ID.
                          </>
                        ) : (
                          <>
                            Click "Get Code" to generate a verification code, send it to your bot, then click "Auto Get" to retrieve your Chat ID.
                          </>
                        )}
                      </>
                    ) : (
                      <>
                        {usesDefaultBot && defaultBotUsername ? (
                          <>
                            系统已内置默认机器人 <strong>@{defaultBotUsername}</strong>。点击「获取验证码」生成验证码，将验证码发送给 <strong>@{defaultBotUsername}</strong>（不要发送给 @TelegramBotRaw），然后点击「自动获取」按钮即可自动获取 chat_id。
                          </>
                        ) : usesDefaultBot ? (
                          <>
                            系统已内置官方机器人 Token。点击「获取验证码」生成验证码，将验证码发送给您的机器人，然后点击「自动获取」按钮即可自动获取 chat_id。
                          </>
                        ) : (
                          <>
                            如使用自建机器人请填写对应 chat_id。点击「获取验证码」生成验证码，将验证码发送给您的机器人，然后点击「自动获取」按钮即可自动获取 chat_id。
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
              {/* 显示当前监控的地址：使用后端实际正在运行的监控线程中的地址 */}
              {/* 这个地址从后端API获取，反映后端实际监控的钱包地址，而不是前端输入框的地址 */}
              {currentMonitoredAddresses && currentMonitoredAddresses.length > 0 ? (
                <div style={{ 
                  marginBottom: '12px', 
                  padding: '8px 12px', 
                  background: 'rgba(91, 124, 250, 0.1)', 
                  border: '1px solid rgba(91, 124, 250, 0.3)', 
                  borderRadius: '4px',
                  fontSize: '0.9rem'
                }}>
                  <strong style={{ color: 'var(--accent-primary, #5b7cfa)' }}>
                    {isEnglish ? 'Currently Monitoring: ' : '当前监控：'}
                  </strong>
                  <span style={{ color: 'var(--text-primary, #fff)' }}>
                    {currentMonitoredAddresses.join(', ')}
                  </span>
                </div>
              ) : (
                <div style={{ 
                  marginBottom: '12px', 
                  padding: '8px 12px', 
                  background: 'rgba(255, 152, 0, 0.1)', 
                  border: '1px solid rgba(255, 152, 0, 0.3)', 
                  borderRadius: '4px',
                  fontSize: '0.9rem'
                }}>
                  <strong style={{ color: 'var(--accent-warning, #ff9800)' }}>
                    {isEnglish ? 'Monitoring Status: ' : '监控状态：'}
                  </strong>
                  <span style={{ color: 'var(--text-primary, #fff)' }}>
                    {isEnglish ? 'Monitoring stopped (no wallet addresses)' : '已停止监控（无钱包地址）'}
                  </span>
                </div>
              )}
              <label className="monitor-config__field">
                <span>{isEnglish ? 'Addresses to Monitor' : '监控地址'}</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {form.walletAddresses.length === 0 ? (
                    <div style={{ padding: '12px', backgroundColor: '#1a1a1a', borderRadius: '4px', color: '#999', fontSize: '0.9rem', border: '1px solid #555' }}>
                      {isEnglish ? 'No wallet addresses added. Click "Add Address" to start monitoring.' : '尚未添加钱包地址。点击「添加地址」开始监控。'}
                    </div>
                  ) : (
                    form.walletAddresses.map((address, index) => (
                      <div key={index} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input
                          type="text"
                          value={address}
                          onChange={(event) => {
                            const newValue = event.target.value;
                            const newAddresses = [...form.walletAddresses];
                            newAddresses[index] = newValue;
                            // 检查是否有重复地址（不区分大小写）
                            const trimmedValue = newValue.trim().toLowerCase();
                            const hasDuplicate = newAddresses.some((addr, idx) => 
                              idx !== index && addr.trim().toLowerCase() === trimmedValue && trimmedValue !== ''
                            );
                            if (hasDuplicate) {
                              setStatus(isEnglish 
                                ? 'Warning: Duplicate wallet address detected. Please use different addresses.' 
                                : '警告：检测到重复的钱包地址，请使用不同的地址。');
                            } else {
                              setStatus('');
                            }
                            setForm((prev) => ({ ...prev, walletAddresses: newAddresses }));
                          }}
                          placeholder={isEnglish ? '0x1234...' : '0x1234...'}
                          disabled={!canEdit || loading}
                          style={{ 
                            flex: 1, 
                            padding: '8px', 
                            borderRadius: '4px', 
                            border: '1px solid #555',
                            backgroundColor: '#1a1a1a',
                            color: '#fff',
                            outline: 'none'
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const newAddresses = form.walletAddresses.filter((_, i) => i !== index);
                            setForm((prev) => ({ ...prev, walletAddresses: newAddresses }));
                          }}
                          disabled={!canEdit || loading}
                          style={{
                            padding: '8px 12px',
                            background: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: !canEdit || loading ? 'not-allowed' : 'pointer',
                            opacity: !canEdit || loading ? 0.6 : 1,
                          }}
                          title={isEnglish ? 'Delete' : '删除'}
                        >
                          {isEnglish ? 'Delete' : '删除'}
                        </button>
                      </div>
                    ))
                  )}
                  {form.walletAddresses.length < 2 && (
                    <button
                      type="button"
                      onClick={() => {
                        setForm((prev) => ({ ...prev, walletAddresses: [...prev.walletAddresses, ''] }));
                      }}
                      disabled={!canEdit || loading}
                      style={{
                        padding: '8px 12px',
                        background: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: !canEdit || loading ? 'not-allowed' : 'pointer',
                        opacity: !canEdit || loading ? 0.6 : 1,
                        alignSelf: 'flex-start',
                      }}
                    >
                      {isEnglish ? '+ Add Address' : '+ 添加地址'}
                    </button>
                  )}
                </div>
                <small>
                  {isEnglish
                    ? 'Up to 2 addresses can be monitored.'
                    : '最多监控 2 个地址。'}
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <button 
                  type="submit" 
                  disabled={!canEdit || loading || isSaving}
                  onClick={(e) => {
                    // 调试：记录按钮点击和禁用状态
                    if (!canEdit || loading || isSaving) {
                      console.warn('[MonitorConfigPanel] 保存按钮被禁用:', {
                        canEdit,
                        loading,
                        isSaving,
                        disabled: !canEdit || loading || isSaving,
                        formWalletAddresses: form.walletAddresses,
                        formWalletAddressesLength: form.walletAddresses.length,
                      });
                    } else {
                      console.log('[MonitorConfigPanel] 保存按钮点击:', {
                        canEdit,
                        loading,
                        isSaving,
                        formWalletAddresses: form.walletAddresses,
                        formWalletAddressesLength: form.walletAddresses.length,
                      });
                    }
                  }}
                >
                  {loading || isSaving ? (isEnglish ? 'Processing…' : '处理中…') : isEnglish ? 'Save' : '保存配置'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const helpText = isEnglish
                      ? `Configuration Save Help:

• Snapshots: Only when wallet addresses CHANGE will the system push a snapshot; the first snapshot for a wallet means monitoring for that wallet has started.
• Wallet replacement logic: The system uses a replacement mechanism. If you have 2 monitored wallets (A, B) and only fill in 1 new wallet (C), it will replace the first wallet, resulting in (B, C). To monitor only 1 wallet, first clear all addresses and save, then add the single wallet address.
• 4-hour snapshots: After monitoring starts, a consolidated position snapshot is automatically pushed every 4 hours for all monitored wallets.
• Trade events: While monitoring is active, every open, close, and partial close will generate a real-time notification.
• Push behavior:
  - Enable Telegram only → Push to Telegram only
  - Enable WeChat only → Push to WeChat only
  - Enable both → Push to both Telegram and WeChat
• Stop monitoring: If you save configuration with the wallet list EMPTY, monitoring stops and no further snapshots or trade notifications are sent.

Note: The save button can only be clicked once every 5 seconds.`
                      : `保存配置帮助说明：

• 快照：只有当钱包地址发生变化时，系统才会为新的钱包地址推送持仓快照；第一次收到某个钱包的快照，就表示该钱包的监控已经开始。
• 钱包替换逻辑：系统使用替换机制。如果您有 2 个监控钱包（A, B）但只填写 1 个新钱包（C），将会替换第一个钱包，结果为（B, C）。如果只想监控 1 个钱包，请先清空所有地址并保存，然后添加单个钱包地址。
• 每 4 小时快照：监控开始后，系统会每 4 小时自动推送一次当前所有监控钱包的持仓快照。
• 交易消息：在监控开启期间，钱包有开仓、平仓、部分平仓等动态交易时，都会实时发送通知。
• 推送行为：
  - 只启用 Telegram → 只推送到 Telegram
  - 只启用企业微信 → 只推送到企业微信
  - 同时启用 → 同时推送到 Telegram 和企业微信
• 停止监控：如果监控地址列表为空时保存配置，则视为停止监控，不再发送快照和交易提醒。

注意：保存配置按钮每 5 秒只能点击一次。`;
                    alert(helpText);
                  }}
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    border: '1px solid #ccc',
                    background: '#f5f5f5',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    padding: 0,
                  }}
                  title={isEnglish ? 'Configuration Save Help' : '保存配置帮助'}
                >
                  ?
            </button>
              </div>
              <p className="monitor-config__hint">
                {isEnglish
                  ? 'After saving, check the console to confirm the monitoring service is running.'
                  : '保存后可在控制台查看监控线程是否启动。'}
              </p>
            </div>

          </form>


      </div>
    </section>
  );
}
