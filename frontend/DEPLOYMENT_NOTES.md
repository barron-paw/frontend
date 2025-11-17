# 前端部署说明

## 清除缓存问题

如果用户反馈看到旧版本的指南，请按以下步骤操作：

### 1. 重新部署前端

```bash
# 确保代码已提交
git add .
git commit -m "Update Telegram Chat ID guide - force cache refresh"
git push

# Vercel 会自动重新部署
```

### 2. 清除 Vercel CDN 缓存

在 Vercel 控制台：
1. 进入项目设置
2. 找到 "Deployments" 页面
3. 点击最新的部署
4. 点击 "Redeploy" 按钮
5. 选择 "Use existing Build Cache" = **取消勾选**

### 3. 用户端清除缓存

**桌面端：**
- Chrome/Edge: `Ctrl + Shift + Delete` → 清除缓存
- Firefox: `Ctrl + Shift + Delete` → 清除缓存
- Safari: `Cmd + Option + E` → 清除缓存

**移动端：**
- 长按刷新按钮 → 选择"强制刷新"或"清除缓存并刷新"
- 或在浏览器设置中清除浏览数据

### 4. 验证部署

访问网站后，按 `F12` 打开开发者工具：
1. 查看 Network 标签
2. 刷新页面
3. 检查 `main.jsx` 或 JavaScript 文件的响应头
4. 确认 `Cache-Control` 头是否正确

### 5. 版本号

当前版本号：`2024.11.17.2`

每次更新指南内容时，请更新：
- `frontend/index.html` 中的 `meta name="version"` 和 `script src` 的 `?v=` 参数
- `frontend/src/components/MonitorConfigPanel.jsx` 中的版本号显示

## 当前指南内容（中文）

```
Telegram Chat ID 配置指南：

1. 点击「获取验证码」按钮生成一个唯一的验证码。

2. 打开 Telegram，将此验证码发送给您的机器人（使用您配置的机器人，或使用默认机器人）。

3. 发送验证码后，点击 Chat ID 输入框旁边的「自动获取」按钮。

4. 系统将自动找到包含验证码的消息，获取您的 Chat ID 并保存。

注意：每个用户都会获得基于其账户的唯一验证码，因此系统可以正确识别哪个 chat_id 属于您。验证码有效期为5分钟。
```

## 当前指南内容（英文）

```
Telegram Chat ID Setup Guide:

1. Click the "Get Code" button to generate a unique verification code.

2. Open Telegram and send this verification code to your bot (the bot configured in your settings, or the default bot if using the default token).

3. After sending the code, click the "Auto Get" button next to the Chat ID input field.

4. The system will automatically find your message containing the verification code and retrieve your Chat ID, then save it.

Note: Each user gets a unique verification code based on their account, so the system can correctly identify which chat_id belongs to you. The verification code is valid for 5 minutes.
```

