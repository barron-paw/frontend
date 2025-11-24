# Vercel 域名配置修复指南

## 当前问题

从截图可以看到：
1. `hypebot.top` 在 Vercel 中配置为 **307 重定向**到 `www.hypebot.top`
2. Cloudflare DNS 记录已正确配置，指向 `cname.vercel-dns.com`
3. 两个域名都显示 "Proxy Detected"

## 修复步骤

### 步骤 1：修改 Vercel 中 `hypebot.top` 的配置

1. **在 Vercel Dashboard 中**：
   - 进入项目 `frontend-45ag` → **Settings** → **Domains**
   - 找到 `hypebot.top`，点击 **Edit** 按钮

2. **修改配置**：
   - 当前选择的是：**"Redirect to Another Domain"**（重定向到另一个域名）
   - **改为选择**：**"Connect to an environment"**（连接到环境）
   - 在下拉菜单中选择：**"Production"**（生产环境）
   - 点击 **Save**（保存）

3. **这样配置后**：
   - `hypebot.top` 将直接连接到生产环境，而不是重定向
   - 两个域名都可以独立访问网站

### 步骤 2：检查 Cloudflare SSL/TLS 设置

由于使用了 Cloudflare 代理（Proxied），需要确保 SSL/TLS 设置正确：

1. **在 Cloudflare Dashboard 中**：
   - 选择域名 `hypebot.top`
   - 进入 **SSL/TLS** 设置

2. **配置 SSL/TLS**：
   - **SSL/TLS encryption mode**: 选择 **Full** 或 **Full (strict)**
   - 不要选择 **Flexible**（这会导致 SSL 错误）

3. **保存设置**

### 步骤 3：验证配置

1. **在 Vercel 中验证**：
   - 返回 Vercel Dashboard → 项目 → Settings → Domains
   - 点击 `hypebot.top` 旁边的 **Refresh** 按钮
   - 等待验证完成
   - 状态应该显示为 "Valid Configuration" 或保持 "Proxy Detected"（这是正常的）

2. **测试访问**：
   - 清除浏览器缓存：`Ctrl + Shift + Delete`
   - 访问 `https://hypebot.top`（应该直接显示网站，不重定向）
   - 访问 `https://www.hypebot.top`（也应该显示网站）

3. **检查 DNS 传播**：
   ```bash
   nslookup hypebot.top
   nslookup www.hypebot.top
   ```
   - 应该显示 Cloudflare 的 IP 地址（因为使用了代理）

## 可选：如果不想使用 Cloudflare 代理

如果你想直接指向 Vercel（不使用 Cloudflare 代理）：

1. **在 Cloudflare DNS 设置中**：
   - 找到 `hypebot.top` 的 CNAME 记录
   - 点击 **Edit**
   - 将 **Proxy status** 从 🟠 **Proxied** 改为 ⚪ **DNS only**（灰色云朵）
   - 点击 **Save**

2. **同样修改 `www` 记录**：
   - 找到 `www` 的 CNAME 记录
   - 点击 **Edit**
   - 将 **Proxy status** 从 🟠 **Proxied** 改为 ⚪ **DNS only**
   - 点击 **Save**

3. **等待 DNS 传播**（5-30 分钟）

4. **验证**：
   ```bash
   nslookup hypebot.top
   ```
   - 应该显示 Vercel 的 IP 地址，而不是 Cloudflare 的

## 当前配置总结

### Cloudflare DNS 记录（已正确配置）：
- ✅ `hypebot.top` → `cname.vercel-dns.com` (CNAME, Proxied)
- ✅ `www` → `cname.vercel-dns.com` (CNAME, Proxied)
- ✅ `api` → `123.58.196.98` (A, DNS only)

### Vercel 配置（需要修改）：
- ❌ `hypebot.top` → 当前配置为 307 重定向到 `www.hypebot.top`
- ✅ `www.hypebot.top` → 已连接到 Production 环境

### 需要做的修改：
1. ✅ 在 Vercel 中将 `hypebot.top` 改为连接到 Production 环境（而不是重定向）
2. ✅ 检查 Cloudflare SSL/TLS 设置为 **Full** 或 **Full (strict)**

## 常见问题

### Q: 修改后还是无法访问？

A:
1. 等待 5-30 分钟让 DNS 和配置更新
2. 清除浏览器缓存和 DNS 缓存：
   - Windows: `ipconfig /flushdns`
   - Mac: `sudo dscacheutil -flushcache`
3. 尝试使用无痕模式访问
4. 检查 Vercel 部署状态是否为 **Ready**

### Q: 两个域名都需要配置吗？

A:
- 不是必须的，但推荐配置两个
- 如果只配置 `www.hypebot.top`，用户访问 `hypebot.top` 时会被重定向
- 如果两个都配置，用户访问任一域名都能直接看到网站

### Q: Cloudflare 代理会影响性能吗？

A:
- Cloudflare 代理通常能提高性能（CDN 加速）
- 但需要确保 SSL/TLS 设置正确
- 如果遇到问题，可以暂时改为 **DNS only** 测试

## 快速检查清单

- [ ] 在 Vercel 中将 `hypebot.top` 改为连接到 Production 环境
- [ ] 检查 Cloudflare SSL/TLS 设置为 **Full** 或 **Full (strict)**
- [ ] 等待 5-30 分钟让配置生效
- [ ] 清除浏览器缓存
- [ ] 测试访问 `https://hypebot.top`
- [ ] 测试访问 `https://www.hypebot.top`
- [ ] 检查网站功能是否正常

