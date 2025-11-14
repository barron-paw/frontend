/**
 * 复制文本到剪贴板（支持移动端）
 * @param {string} text - 要复制的文本
 * @returns {Promise<boolean>} - 是否复制成功
 */
export function copyToClipboard(text) {
  if (!text) {
    return Promise.resolve(false);
  }

  // 方法1: 使用现代 Clipboard API（需要 HTTPS 或 localhost）
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard
      .writeText(text)
      .then(() => true)
      .catch(() => {
        // 如果 Clipboard API 失败，尝试降级方案
        return fallbackCopyToClipboard(text);
      });
  }

  // 方法2: 降级方案（兼容移动端和旧浏览器）
  return fallbackCopyToClipboard(text);
}

/**
 * 降级复制方案：使用 textarea + execCommand
 * @param {string} text - 要复制的文本
 * @returns {Promise<boolean>} - 是否复制成功
 */
function fallbackCopyToClipboard(text) {
  return new Promise((resolve) => {
    try {
      // 创建一个临时的 textarea 元素
      const textArea = document.createElement('textarea');
      textArea.value = text;
      
      // 设置样式使其不可见但可选择
      textArea.style.position = 'fixed';
      textArea.style.top = '0';
      textArea.style.left = '0';
      textArea.style.width = '2em';
      textArea.style.height = '2em';
      textArea.style.padding = '0';
      textArea.style.border = 'none';
      textArea.style.outline = 'none';
      textArea.style.boxShadow = 'none';
      textArea.style.background = 'transparent';
      textArea.style.opacity = '0';
      textArea.style.pointerEvents = 'none';
      textArea.style.zIndex = '-1';
      
      // 添加到 DOM
      document.body.appendChild(textArea);
      
      // 在移动设备上，需要先聚焦
      textArea.focus();
      textArea.select();
      
      // 对于移动设备，使用 setSelectionRange
      if (textArea.setSelectionRange) {
        textArea.setSelectionRange(0, text.length);
      }
      
      // 尝试复制
      const successful = document.execCommand('copy');
      
      // 移除临时元素
      document.body.removeChild(textArea);
      
      if (successful) {
        resolve(true);
      } else {
        console.warn('Fallback copy command failed');
        resolve(false);
      }
    } catch (err) {
      console.error('Failed to copy text:', err);
      resolve(false);
    }
  });
}

