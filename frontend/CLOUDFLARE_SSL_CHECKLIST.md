# Cloudflare SSL/TLS 配置检查清单

## 当前状态

从截图看到：
- ✅ SSL/TLS 加密模式：**Full**（完全模式）- 这是正确的
- ⚠️ 自动模式在4天前被禁用

## 需要检查的配置

### 1. SSL/TLS 模式设置

当前设置：**Full**（完全模式）

**检查步骤**：
1. 在 Cloudflare Dashboard 中，进入 **SSL/TLS** → **概述**
2. 确认加密模式为以下之一：
   - ✅ **Full (strict)**（完全（严格））- 最推荐
   - ✅ **Full**（完全）- 当前设置，也可以
   - ❌ **Flexible**（灵活）- 不推荐，可能导致错误

**如果当前是 "Full"，建议改为 "Full (strict)"**：
- 点击加密模式旁边的下拉菜单
- 选择 **Full (strict)**
- 保存更改

### 2. 检查其他 SSL/TLS 设置

在 **SSL/TLS** 页面，检查以下设置：

#### 2.1 始终使用 HTTPS
- 位置：**SSL/TLS** → **边缘证书**
- 设置：**始终使用 HTTPS** 应该为 **开启**

#### 2.2 自动 HTTPS 重写
- 位置：**SSL/TLS** → **边缘证书**
- 设置：**自动 HTTPS 重写** 应该为 **开启**

#### 2.3 最低 TLS 版本
- 位置：**SSL/TLS** → **边缘证书**
- 设置：**最低 TLS 版本** 应该为 **1.2** 或更高

### 3. 检查边缘证书

在 **SSL/TLS** → **边缘证书** 页面：

1. **检查证书状态**：
   - 应该显示 "Active Certificate"（活动证书）
   - 证书应该有效且未过期

2. **检查证书类型**：
   - 应该是 "Universal SSL" 或 "Full (strict)" 证书

### 4. 检查 Vercel 的 SSL 证书

在 Vercel Dashboard 中：

1. 进入项目 → **Settings** → **Domains**
2. 点击 `hypebot.top` 域名
3. 检查 SSL 证书状态：
   - 应该显示 "Valid"（有效）
   - 证书应该未过期

### 5. 检查 DNS 记录

在 **DNS** → **Records** 页面：

1. 检查 `hypebot.top` 的记录：
   - 类型：CNAME 或 A 记录
   - 代理状态：🟠 Proxied 或 ⚪ DNS only
   - 目标：应该指向 Vercel

2. 检查 `www.hypebot.top` 的记录：
   - 类型：CNAME
   - 代理状态：与根域名保持一致
   - 目标：应该指向 `hypebot.top` 或 Vercel

## 针对错误-101的额外检查

### 检查1：证书链完整性

错误-101可能是由于证书链不完整导致的。

**检查步骤**：
1. 在 Cloudflare Dashboard 中，进入 **SSL/TLS** → **边缘证书**
2. 检查证书链是否完整
3. 如果使用 "Full (strict)" 模式，确保 Vercel 的 SSL 证书有效

### 检查2：TLS 版本兼容性

某些安卓设备可能不支持较新的 TLS 版本。

**检查步骤**：
1. 在 Cloudflare Dashboard 中，进入 **SSL/TLS** → **边缘证书**
2. 检查 **最低 TLS 版本** 设置
3. 如果设置为 1.3，尝试改为 1.2（更兼容）

### 检查3：Cloudflare 代理状态

如果使用 Cloudflare 代理（🟠 Proxied），需要确保配置正确。

**检查步骤**：
1. 在 **DNS** → **Records** 页面
2. 检查代理状态：
   - 如果使用代理（🟠 Proxied），SSL/TLS 模式必须是 "Full" 或 "Full (strict)"
   - 如果使用 DNS only（⚪），SSL/TLS 模式可以是任何模式

## 推荐的配置更改

### 步骤1：将 SSL/TLS 模式改为 "Full (strict)"

1. 在 Cloudflare Dashboard 中，进入 **SSL/TLS** → **概述**
2. 点击加密模式旁边的下拉菜单
3. 选择 **Full (strict)**
4. 保存更改

### 步骤2：检查并启用相关设置

1. 进入 **SSL/TLS** → **边缘证书**
2. 确保以下设置已开启：
   - ✅ 始终使用 HTTPS
   - ✅ 自动 HTTPS 重写
3. 检查 **最低 TLS 版本**：
   - 如果设置为 1.3，考虑改为 1.2（更兼容安卓设备）

### 步骤3：等待配置生效

- 配置更改通常需要 1-5 分钟生效
- 清除浏览器缓存后重新测试

## 如果问题仍然存在

### 临时解决方案

1. **尝试 DNS only 模式**：
   - 在 **DNS** → **Records** 页面
   - 将代理状态改为 ⚪ DNS only
   - 等待 5-10 分钟让 DNS 传播
   - 重新测试

2. **使用 VPN**：
   - 已确认 VPN 可以访问
   - 这是最快的临时解决方案

### 进一步诊断

如果以上都不行，请检查：

1. **Vercel 部署状态**：
   - 确保部署状态为 "Ready"
   - 检查是否有部署错误

2. **网络运营商限制**：
   - 尝试使用不同的网络（WiFi vs 移动数据）
   - 尝试使用不同的运营商

3. **设备特定问题**：
   - 尝试使用不同的安卓设备
   - 尝试使用不同的浏览器

## 检查清单

- [ ] SSL/TLS 模式设置为 "Full (strict)" 或 "Full"
- [ ] "始终使用 HTTPS" 已开启
- [ ] "自动 HTTPS 重写" 已开启
- [ ] 最低 TLS 版本设置为 1.2 或更高
- [ ] 边缘证书有效且未过期
- [ ] Vercel 的 SSL 证书有效
- [ ] DNS 记录正确指向 Vercel
- [ ] 代理状态正确（Proxied 或 DNS only）

