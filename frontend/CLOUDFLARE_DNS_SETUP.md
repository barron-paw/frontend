# Cloudflare DNS 配置指南

## 确认信息

根据 DNS 查询结果，你的域名 `hypebot.top` 使用 Cloudflare 的 DNS 服务器：
- `phil.ns.cloudflare.com`
- `perla.ns.cloudflare.com`

这意味着你需要在 **Cloudflare Dashboard** 中配置 DNS 记录。

## 配置步骤

### 步骤 1：登录 Cloudflare Dashboard

1. 访问：https://dash.cloudflare.com/
2. 使用你的 Cloudflare 账号登录
3. 在左侧菜单中找到并点击你的域名 `hypebot.top`

### 步骤 2：进入 DNS 设置

1. 在左侧菜单中，点击 **DNS**（或 **DNS** → **Records**）
2. 你会看到当前的 DNS 记录列表

### 步骤 3：查看 Vercel 需要的 DNS 记录

在 Vercel Dashboard 中：
1. 进入项目 `frontend-45ag` → **Settings** → **Domains**
2. 点击 `hypebot.top` 域名旁边的 **Edit** 按钮
3. 查看 Vercel 显示的 DNS 配置要求

通常有两种情况：

#### 情况 A：Vercel 要求 CNAME 记录（推荐）

如果 Vercel 显示类似这样的信息：
```
Type: CNAME
Name: @
Value: cname.vercel-dns.com
```

或者：
```
Type: CNAME
Name: @
Value: 76.76.21.21
```

#### 情况 B：Vercel 要求 A 记录

如果 Vercel 显示类似这样的信息：
```
Type: A
Name: @
Value: 76.76.21.21
```

### 步骤 4：在 Cloudflare 中添加/修改 DNS 记录

#### 如果使用 CNAME 记录（推荐）：

1. 在 Cloudflare DNS 页面，点击 **Add record**（添加记录）
2. 配置如下：
   - **Type（类型）**: 选择 `CNAME`
   - **Name（名称）**: 输入 `@` 或留空（表示根域名 `hypebot.top`）
   - **Target（目标）**: 输入 Vercel 提供的 CNAME 值（例如：`cname.vercel-dns.com`）
   - **Proxy status（代理状态）**: 
     - **如果使用 Cloudflare 代理**：选择 🟠 **Proxied**（橙色云朵）
     - **如果直接指向 Vercel**：选择 ⚪ **DNS only**（灰色云朵）
   - **TTL**: 选择 `Auto` 或 `1 hour`
3. 点击 **Save**（保存）

#### 如果使用 A 记录：

1. 在 Cloudflare DNS 页面，点击 **Add record**（添加记录）
2. 配置如下：
   - **Type（类型）**: 选择 `A`
   - **Name（名称）**: 输入 `@` 或留空（表示根域名 `hypebot.top`）
   - **IPv4 address（IPv4 地址）**: 输入 Vercel 提供的 IP 地址（例如：`76.76.21.21`）
   - **Proxy status（代理状态）**: 
     - **如果使用 Cloudflare 代理**：选择 🟠 **Proxied**（橙色云朵）
     - **如果直接指向 Vercel**：选择 ⚪ **DNS only**（灰色云朵）
   - **TTL**: 选择 `Auto` 或 `1 hour`
3. 点击 **Save**（保存）

### 步骤 5：配置 www 子域名（可选但推荐）

如果 Vercel 也要求配置 `www.hypebot.top`：

1. 在 Cloudflare DNS 页面，点击 **Add record**（添加记录）
2. 配置如下：
   - **Type（类型）**: 选择 `CNAME`
   - **Name（名称）**: 输入 `www`
   - **Target（目标）**: 输入 `hypebot.top` 或 Vercel 提供的 CNAME 值
   - **Proxy status（代理状态）**: 与根域名保持一致（🟠 Proxied 或 ⚪ DNS only）
   - **TTL**: 选择 `Auto` 或 `1 hour`
3. 点击 **Save**（保存）

### 步骤 6：删除或修改旧的 DNS 记录

如果之前有指向 Cloudflare 的 A 记录（例如：`104.21.65.51` 或 `172.67.140.170`），需要：

1. 找到这些旧的 A 记录
2. 点击记录右侧的 **Edit**（编辑）按钮
3. 修改为 Vercel 提供的值，或者
4. 点击 **Delete**（删除）按钮删除旧记录

## 重要提示

### 关于 Cloudflare 代理（Proxy）

- **🟠 Proxied（橙色云朵）**：通过 Cloudflare 代理，提供 DDoS 保护、CDN 加速等功能
- **⚪ DNS only（灰色云朵）**：直接指向目标服务器，不经过 Cloudflare 代理

**建议**：
- 如果使用 Cloudflare 代理，确保在 Vercel 中也添加了自定义域名
- 如果直接指向 Vercel，选择 **DNS only** 更简单

### 关于 SSL/TLS 设置

如果使用 Cloudflare 代理：

1. 在 Cloudflare Dashboard 中，进入 **SSL/TLS** 设置
2. 选择 **Full** 或 **Full (strict)** 模式
3. 确保 Vercel 的 SSL 证书已正确配置

## 验证配置

### 1. 检查 DNS 记录

在 Cloudflare DNS 页面，确认记录已正确添加：
- ✅ `@` 或 `hypebot.top` 的 CNAME/A 记录指向 Vercel
- ✅ `www` 的 CNAME 记录（如果配置了）

### 2. 等待 DNS 传播

- DNS 更新通常需要 5-30 分钟
- 可以使用以下命令检查：
  ```bash
  nslookup hypebot.top
  ```
- 应该显示 Vercel 的 IP 地址，而不是 Cloudflare 的

### 3. 在 Vercel 中验证

1. 返回 Vercel Dashboard → 项目 → Settings → Domains
2. 点击 `hypebot.top` 域名旁边的 **Refresh** 按钮
3. 等待验证完成
4. 状态应该从 "Proxy Detected" 变为 "Valid Configuration"

### 4. 测试网站访问

1. 清除浏览器缓存：`Ctrl + Shift + Delete`
2. 访问 `https://hypebot.top`
3. 应该能看到网站内容，而不是"网页走丢了"

## 常见问题

### Q: 找不到 Cloudflare 账号？

A: 
- 检查你的邮箱，看是否有 Cloudflare 的注册邮件
- 或者，域名可能是在其他注册商注册的，但 DNS 由 Cloudflare 管理
- 尝试在域名注册商那里查看 DNS 设置

### Q: 在 Cloudflare 中找不到 DNS 设置？

A:
1. 确保已登录正确的 Cloudflare 账号
2. 确保已选择正确的域名（`hypebot.top`）
3. 在左侧菜单中查找 **DNS** 或 **DNS** → **Records**

### Q: Vercel 显示 "Proxy Detected" 怎么办？

A:
- 这是正常的，表示检测到 Cloudflare 代理
- 只要 DNS 记录正确指向 Vercel，网站应该可以正常访问
- 如果无法访问，检查 Cloudflare 的 SSL/TLS 设置是否为 **Full** 或 **Full (strict)**

### Q: 配置后还是无法访问？

A:
1. 等待 5-30 分钟让 DNS 传播
2. 清除浏览器 DNS 缓存：
   - Windows: `ipconfig /flushdns`
   - Mac: `sudo dscacheutil -flushcache`
3. 尝试使用其他网络访问
4. 检查 Cloudflare 的 **SSL/TLS** 设置
5. 检查 Vercel 部署状态是否为 **Ready**

## 快速检查清单

- [ ] 已登录 Cloudflare Dashboard
- [ ] 已选择域名 `hypebot.top`
- [ ] 已进入 DNS 设置页面
- [ ] 已查看 Vercel 要求的 DNS 记录类型和值
- [ ] 已添加/修改 CNAME 或 A 记录
- [ ] 已配置 `www` 子域名（可选）
- [ ] 已删除或修改旧的 DNS 记录
- [ ] 已等待 5-30 分钟让 DNS 传播
- [ ] 已在 Vercel 中验证域名
- [ ] 网站可以正常访问

