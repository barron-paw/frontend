# 电脑端 HTTPS 连接错误修复指南

## 问题症状

- DNS 解析正常（能解析到 Cloudflare IP）
- Ping 正常（能 ping 通）
- 但 HTTPS 连接失败："基础连接已经关闭: 发送时发生错误"

## 可能的原因

1. **SSL/TLS 握手失败**
2. **Cloudflare SSL/TLS 配置问题**
3. **Vercel 部署问题**
4. **网络防火墙/代理阻止**
5. **系统时间不正确**

## 诊断步骤

### 1. 检查浏览器错误

在浏览器中访问 `https://hypebot.top` 或 `https://www.hypebot.top`，查看：

1. **按 F12 打开开发者工具**
2. **查看 Console 标签页的错误信息**
3. **查看 Network 标签页的请求状态**

常见错误：
- `ERR_SSL_PROTOCOL_ERROR` - SSL 协议错误
- `ERR_CONNECTION_CLOSED` - 连接关闭
- `ERR_CONNECTION_RESET` - 连接重置
- `ERR_CERT_AUTHORITY_INVALID` - 证书错误

### 2. 检查系统时间

**Windows**：
1. 右键点击任务栏右下角的时间
2. 选择"调整日期/时间"
3. 确保"自动设置时间"已开启
4. 确保时区正确

**如果时间不正确**：
- 手动同步时间
- 或重启电脑

### 3. 清除 DNS 缓存

```powershell
# Windows PowerShell (以管理员身份运行)
ipconfig /flushdns
```

### 4. 清除浏览器缓存和 Cookie

**Chrome/Edge**：
1. 按 `Ctrl + Shift + Delete`
2. 选择"时间范围"为"全部时间"
3. 勾选"缓存的图片和文件"和"Cookie 及其他网站数据"
4. 点击"清除数据"

**Firefox**：
1. 按 `Ctrl + Shift + Delete`
2. 选择"时间范围"为"全部"
3. 勾选"Cookie"和"缓存"
4. 点击"立即清除"

### 5. 检查防火墙和代理设置

**Windows 防火墙**：
1. 打开"Windows 安全中心"
2. 点击"防火墙和网络保护"
3. 临时关闭防火墙测试

**代理设置**：
1. 打开"设置" > "网络和 Internet" > "代理"
2. 确保"使用代理服务器"已关闭
3. 或检查代理服务器设置是否正确

### 6. 尝试不同的浏览器

- Chrome
- Firefox
- Edge
- Safari

### 7. 尝试使用 VPN

如果使用 VPN 后能访问，可能是：
- 网络运营商的问题
- 地区限制
- DNS 污染

### 8. 检查 Cloudflare SSL/TLS 设置

1. 登录 Cloudflare 控制台
2. 选择域名 `hypebot.top`
3. 进入 "SSL/TLS" 设置
4. 检查以下设置：
   - **加密模式**：应该是 "Full" 或 "Full (strict)"
   - **最低 TLS 版本**：应该是 "1.2" 或更高
   - **始终使用 HTTPS**：应该开启
   - **自动 HTTPS 重写**：应该开启

### 9. 检查 Vercel 部署状态

1. 登录 Vercel 控制台
2. 检查项目部署状态
3. 查看最近的部署日志
4. 检查域名配置是否正确

### 10. 检查 hosts 文件

```powershell
# Windows PowerShell (以管理员身份运行)
notepad C:\Windows\System32\drivers\etc\hosts
```

检查是否有 `hypebot.top` 的异常条目，如果有，删除它。

## 快速修复命令

```powershell
# 1. 清除 DNS 缓存
ipconfig /flushdns

# 2. 重置网络适配器
netsh winsock reset
netsh int ip reset

# 3. 重启网络服务
net stop dnscache
net start dnscache

# 4. 刷新网络配置
ipconfig /release
ipconfig /renew
```

## 临时解决方案

如果以上方法都不行，可以尝试：

1. **使用 IP 地址访问**（不推荐，仅用于测试）：
   - 访问 `https://104.21.65.51`（需要配置 hosts 文件）

2. **使用不同的 DNS 服务器**：
   - 更改 DNS 为 `8.8.8.8` 和 `8.8.4.4`（Google DNS）
   - 或 `1.1.1.1` 和 `1.0.0.1`（Cloudflare DNS）

3. **使用移动网络**：
   - 使用手机热点测试
   - 如果手机热点能访问，可能是网络运营商的问题

## 检查 Cloudflare 和 Vercel 状态

1. **Cloudflare 状态**：
   - https://www.cloudflarestatus.com/

2. **Vercel 状态**：
   - https://www.vercel-status.com/

## 下一步

根据诊断结果：
1. 如果浏览器显示 SSL 错误，检查 Cloudflare SSL/TLS 设置
2. 如果连接超时，检查防火墙和代理设置
3. 如果所有方法都不行，检查 Vercel 部署状态

## 联系支持

如果问题持续存在，请提供以下信息：
1. 浏览器错误信息（F12 Console）
2. 网络错误信息（F12 Network）
3. 系统时间是否正确
4. 是否使用 VPN 或代理
5. 网络运营商信息

