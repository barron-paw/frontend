# 电脑端无法访问 hypebot.top 诊断指南

## 问题描述

电脑端突然无法访问 hypebot.top。

## 诊断步骤

### 1. 检查 DNS 解析

```powershell
# Windows PowerShell
nslookup hypebot.top
nslookup www.hypebot.top
```

**预期结果**：
- 应该解析到 Cloudflare 的 IP 地址（如 104.21.65.51, 172.67.140.170）
- 如果解析失败，可能是 DNS 问题

### 2. 检查网络连接

```powershell
# Windows PowerShell
ping hypebot.top
ping www.hypebot.top
```

**预期结果**：
- 应该能 ping 通
- 如果 ping 不通，可能是网络问题或防火墙阻止

### 3. 检查 HTTPS 连接

```powershell
# Windows PowerShell
curl -I https://hypebot.top
curl -I https://www.hypebot.top
```

**预期结果**：
- 应该返回 HTTP 200 或 301/302 重定向
- 如果返回错误，可能是 SSL/TLS 问题

### 4. 检查浏览器错误

在浏览器中访问 `https://hypebot.top` 或 `https://www.hypebot.top`，查看：

1. **错误代码**：
   - `ERR_CONNECTION_REFUSED` - 连接被拒绝
   - `ERR_CONNECTION_TIMED_OUT` - 连接超时
   - `ERR_SSL_PROTOCOL_ERROR` - SSL 协议错误
   - `ERR_CERT_AUTHORITY_INVALID` - 证书错误
   - `ERR_NAME_NOT_RESOLVED` - DNS 解析失败

2. **开发者工具**：
   - 按 `F12` 打开开发者工具
   - 查看 `Console` 标签页的错误信息
   - 查看 `Network` 标签页的请求状态

### 5. 检查 Cloudflare 状态

访问 Cloudflare 状态页面：
- https://www.cloudflarestatus.com/

检查是否有服务中断。

### 6. 检查 Vercel 部署状态

1. 登录 Vercel 控制台
2. 检查项目部署状态
3. 查看最近的部署日志

### 7. 尝试不同的网络

1. **切换网络**：
   - 尝试使用手机热点
   - 尝试使用 VPN
   - 尝试使用不同的 WiFi 网络

2. **清除 DNS 缓存**：
   ```powershell
   # Windows PowerShell (以管理员身份运行)
   ipconfig /flushdns
   ```

3. **清除浏览器缓存**：
   - 按 `Ctrl + Shift + Delete`
   - 清除缓存和 Cookie

### 8. 检查防火墙和代理设置

1. **Windows 防火墙**：
   - 检查是否阻止了浏览器访问
   - 临时关闭防火墙测试

2. **代理设置**：
   - 检查系统代理设置
   - 检查浏览器代理设置

3. **杀毒软件**：
   - 检查杀毒软件是否阻止了访问
   - 临时关闭杀毒软件测试

### 9. 检查 hosts 文件

```powershell
# Windows PowerShell (以管理员身份运行)
notepad C:\Windows\System32\drivers\etc\hosts
```

检查是否有 `hypebot.top` 的异常条目。

### 10. 尝试不同的浏览器

- Chrome
- Firefox
- Edge
- Safari

## 常见问题和解决方案

### 问题1：DNS 解析失败

**症状**：`ERR_NAME_NOT_RESOLVED`

**解决方案**：
1. 清除 DNS 缓存：`ipconfig /flushdns`
2. 更换 DNS 服务器（如 8.8.8.8, 1.1.1.1）
3. 重启网络适配器

### 问题2：SSL/TLS 错误

**症状**：`ERR_SSL_PROTOCOL_ERROR` 或 `ERR_CERT_AUTHORITY_INVALID`

**解决方案**：
1. 检查系统时间是否正确
2. 清除浏览器 SSL 状态
3. 检查 Cloudflare SSL/TLS 设置

### 问题3：连接超时

**症状**：`ERR_CONNECTION_TIMED_OUT`

**解决方案**：
1. 检查防火墙设置
2. 检查代理设置
3. 尝试使用 VPN

### 问题4：连接被拒绝

**症状**：`ERR_CONNECTION_REFUSED`

**解决方案**：
1. 检查 Vercel 部署状态
2. 检查 Cloudflare 状态
3. 检查域名配置

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
```

## 下一步

根据诊断结果：
1. 如果 DNS 解析正常，检查 HTTPS 连接
2. 如果 HTTPS 连接正常，检查浏览器错误
3. 如果浏览器有错误，根据错误代码查找解决方案

