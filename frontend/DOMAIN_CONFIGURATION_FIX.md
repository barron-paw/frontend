# 域名配置修复指南

## 问题诊断

根据 DNS 解析结果，`hypebot.top` 当前指向 Cloudflare 的 IP 地址：
- `104.21.65.51`
- `172.67.140.170`

但 Vercel 部署需要域名直接指向 Vercel，或者通过 Cloudflare 正确代理到 Vercel。

## 解决方案

### 方案1：在 Vercel 中配置自定义域名（推荐）

1. **登录 Vercel Dashboard**
   - 访问：https://vercel.com/dashboard
   - 找到你的项目（`frontend-45ag`）

2. **添加自定义域名**
   - 进入项目 → **Settings** → **Domains**
   - 点击 **Add Domain**
   - 输入：`hypebot.top`
   - 点击 **Add**
   - 如果提示添加 `www.hypebot.top`，也一并添加

3. **配置 DNS 记录**
   - Vercel 会显示需要配置的 DNS 记录
   - 通常是一个 CNAME 记录，指向 Vercel 的域名（例如：`cname.vercel-dns.com`）
   - 或者 A 记录，指向 Vercel 的 IP 地址

4. **更新 DNS 配置**
   - 登录你的域名注册商（例如：Namecheap、GoDaddy、Cloudflare 等）
   - 找到 DNS 管理页面
   - 删除或修改现有的 A 记录（指向 Cloudflare 的）
   - 添加 Vercel 提供的 CNAME 或 A 记录

5. **等待 DNS 传播**
   - DNS 更新通常需要 5-30 分钟
   - 可以使用 `nslookup hypebot.top` 检查是否已更新

### 方案2：通过 Cloudflare 代理到 Vercel（如果必须使用 Cloudflare）

如果你必须使用 Cloudflare（例如：需要 DDoS 保护、CDN 加速等），可以配置 Cloudflare 代理到 Vercel：

1. **在 Vercel 中获取部署 URL**
   - 在 Vercel Dashboard 中找到项目的 `.vercel.app` 域名
   - 例如：`frontend-45ag-git-main-bangran-baos-projects.vercel.app`

2. **在 Cloudflare 中配置**
   - 登录 Cloudflare Dashboard
   - 选择 `hypebot.top` 域名
   - 进入 **DNS** 设置
   - 添加或修改 CNAME 记录：
     - **Name**: `@` 或 `hypebot.top`
     - **Target**: `frontend-45ag-git-main-bangran-baos-projects.vercel.app`
     - **Proxy status**: 🟠 Proxied（橙色云朵）
   - 如果使用 `www` 子域名，也添加：
     - **Name**: `www`
     - **Target**: `frontend-45ag-git-main-bangran-baos-projects.vercel.app`
     - **Proxy status**: 🟠 Proxied

3. **在 Vercel 中添加自定义域名**
   - 即使通过 Cloudflare 代理，也需要在 Vercel 中添加域名
   - 在 Vercel Dashboard → 项目 → Settings → Domains
   - 添加 `hypebot.top` 和 `www.hypebot.top`
   - Vercel 会自动验证域名所有权

4. **配置 SSL/TLS**
   - 在 Cloudflare 中，进入 **SSL/TLS** 设置
   - 选择 **Full** 或 **Full (strict)** 模式
   - 确保 Vercel 的 SSL 证书已正确配置

### 方案3：直接使用 Vercel 分配的域名（临时方案）

如果域名配置有问题，可以临时使用 Vercel 分配的域名：

1. **获取 Vercel 域名**
   - 在 Vercel Dashboard 中找到项目的部署
   - 查看 **Domains** 部分
   - 找到 `.vercel.app` 域名，例如：
     - `frontend-45ag-git-main-bangran-baos-projects.vercel.app`
     - `frontend-45ag-8r4izv8ra-bangran-baos-projects.vercel.app`

2. **访问网站**
   - 直接访问 Vercel 分配的域名
   - 例如：`https://frontend-45ag-git-main-bangran-baos-projects.vercel.app`

## 验证步骤

### 1. 检查 DNS 解析

```bash
# Windows PowerShell
nslookup hypebot.top

# 应该显示 Vercel 的 IP 地址，而不是 Cloudflare 的
```

### 2. 检查网站可访问性

```bash
# 使用浏览器访问
https://hypebot.top
https://www.hypebot.top

# 应该显示网站内容，而不是"网页走丢了"
```

### 3. 检查 Vercel 部署状态

- 在 Vercel Dashboard 中查看最新部署
- 确认状态为 **Ready**（不是 **Stale**）
- 如果状态是 **Stale**，点击 **Redeploy**

### 4. 检查 SSL 证书

- 在浏览器中访问网站
- 点击地址栏的锁图标
- 确认 SSL 证书有效

## 常见问题

### Q: DNS 更新后还是无法访问？

A: 
1. 等待 5-30 分钟让 DNS 传播
2. 清除浏览器 DNS 缓存：
   - Windows: `ipconfig /flushdns`
   - Mac: `sudo dscacheutil -flushcache`
3. 尝试使用其他网络（例如：移动数据）访问

### Q: Cloudflare 代理后还是无法访问？

A:
1. 检查 Cloudflare 的 **SSL/TLS** 设置是否为 **Full** 或 **Full (strict)**
2. 检查 Vercel 中是否已添加自定义域名
3. 检查 Cloudflare 的 **Page Rules** 是否阻止了请求
4. 尝试暂时关闭 Cloudflare 代理（灰色云朵），直接指向 Vercel

### Q: Vercel 显示域名验证失败？

A:
1. 确保 DNS 记录已正确配置
2. 等待 DNS 传播完成
3. 在 Vercel Dashboard 中点击 **Retry Verification**
4. 如果使用 Cloudflare，确保代理状态正确

## 快速检查清单

- [ ] Vercel 项目中已添加 `hypebot.top` 域名
- [ ] DNS 记录已正确配置（CNAME 或 A 记录）
- [ ] DNS 已传播（`nslookup` 显示正确的 IP）
- [ ] Vercel 部署状态为 **Ready**
- [ ] SSL 证书有效
- [ ] 网站可以正常访问
- [ ] 浏览器控制台没有错误

## 下一步

完成域名配置后：

1. **清除浏览器缓存**
   - `Ctrl + Shift + Delete` → 清除缓存

2. **测试网站功能**
   - 登录/注册
   - 配置监控
   - 测试 API 请求

3. **检查 API 代理**
   - 确认 `/api/*` 请求正确代理到 `https://api.hypebot.top/api/*`

