58cd45d6-f61f-48e3-a4d1-c3d6c72ce83e.png# 调试微信配置问题

## 问题

用户报告："就是收不到65d快照"

从日志看：
- 前端发送了 `payload.enabled=True`
- 但 `payload.webhook_url=False`（长度为0）
- 导致后端计算出 `final_enabled=False`
- 因此没有启用微信推送

## 诊断步骤

### 1. 检查浏览器 Network 请求

1. 打开浏览器开发者工具（F12）
2. 进入 **Network** 标签
3. 清空请求列表（点击清除按钮）
4. 在配置页面：
   - 确保"启用企业微信推送"已勾选
   - 确保 Webhook URL 有值
   - 点击"保存配置"
5. 找到 `/api/wecom` 请求
6. 点击该请求，查看：
   - **Headers** 标签 → **Request Payload** 或 **Payload** 标签
   - 确认 `enabled` 和 `webhookUrl` 的值

**期望值**：
```json
{
  "enabled": true,
  "webhookUrl": "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?...",
  "mentions": []
}
```

**如果看到**：
```json
{
  "enabled": true,
  "webhookUrl": null,
  "mentions": []
}
```
或
```json
{
  "enabled": true,
  "webhookUrl": "",
  "mentions": []
}
```
说明前端代码可能还没有部署，或者 `form.wecomWebhookUrl` 为空。

### 2. 检查浏览器控制台

1. 打开浏览器开发者工具（F12）
2. 进入 **Console** 标签
3. 清空控制台
4. 点击"保存配置"
5. 查看是否有以下日志：
   - `Saving WeCom config: {enabled: true, webhookUrl: "...", mentions: []}`
   - `WeCom config saved: {...}`

**如果看到**：
```
Saving WeCom config: {enabled: true, webhookUrl: null, mentions: []}
```
说明 `form.wecomWebhookUrl` 为空。

### 3. 检查前端代码是否已部署

1. 查看浏览器 Network 标签中的 `/api/wecom` 请求
2. 查看 **Response** 标签，确认后端返回的数据
3. 检查前端代码版本：
   - 在浏览器中按 `Ctrl+Shift+I` 打开开发者工具
   - 进入 **Sources** 标签
   - 找到 `MonitorConfigPanel.jsx`
   - 查看第 358-359 行：
     ```javascript
     enabled: form.wecomEnabled,  // 直接使用用户的选择
     webhookUrl: form.wecomWebhookUrl.trim() || null,
     ```
   - 如果代码不是这样，说明前端代码还没有部署

### 4. 清除浏览器缓存

如果前端代码已部署但浏览器还在使用旧代码：

1. 清除浏览器缓存：
   - `Ctrl + Shift + Delete`
   - 选择"缓存的图片和文件"
   - 点击"清除数据"

2. 硬刷新页面：
   - `Ctrl + Shift + R`（Windows）
   - `Cmd + Shift + R`（Mac）

3. 或者使用无痕模式测试

## 解决方案

### 方案 1：确认前端代码已部署

1. 检查 Git 提交记录：
   ```bash
   git log --oneline -5 frontend/src/components/MonitorConfigPanel.jsx
   ```

2. 如果代码已提交但未推送：
   ```bash
   git push
   ```

3. 等待 Vercel 重新部署（1-3 分钟）

4. 清除浏览器缓存并重新测试

### 方案 2：检查前端表单状态

如果前端代码已部署，但 `form.wecomWebhookUrl` 仍然为空：

1. 在浏览器控制台中执行：
   ```javascript
   // 检查表单状态（需要先打开配置页面）
   // 在 Console 中执行
   document.querySelector('input[type="text"][placeholder*="webhook"]')?.value
   ```

2. 如果返回 `null` 或空字符串，说明输入框为空

3. 重新填写 Webhook URL 并保存

### 方案 3：临时修复（如果前端代码未部署）

如果前端代码还没有部署，可以临时修改后端逻辑，允许 `webhook_url` 为空时也启用（不推荐，但可以快速测试）：

**注意**：这只是临时方案，最终还是要修复前端代码。

## 快速检查清单

- [ ] 浏览器 Network 标签中 `/api/wecom` 请求的 Payload 中 `webhookUrl` 有值
- [ ] 浏览器控制台中有 `Saving WeCom config:` 日志，且 `webhookUrl` 有值
- [ ] 前端代码已部署（检查 Sources 标签中的代码）
- [ ] 浏览器缓存已清除
- [ ] 页面已硬刷新
- [ ] Webhook URL 输入框中有值

## 下一步

请执行以下操作并提供结果：

1. **检查浏览器 Network 标签**：
   - 找到 `/api/wecom` 请求
   - 查看 **Payload** 标签
   - 告诉我 `enabled` 和 `webhookUrl` 的值

2. **检查浏览器控制台**：
   - 查看是否有 `Saving WeCom config:` 日志
   - 告诉我日志中的 `webhookUrl` 值

3. **检查前端代码版本**：
   - 在 Sources 标签中找到 `MonitorConfigPanel.jsx`
   - 查看第 358-359 行的代码
   - 告诉我代码内容

