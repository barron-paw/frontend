# Vercel 前端部署诊断指南

## 快速检查步骤

### 1. 检查 Vercel 部署状态

1. **登录 Vercel Dashboard**
   - 访问：https://vercel.com/dashboard
   - 找到你的项目（hypebot 或相关项目名）

2. **查看最新部署**
   - 点击项目进入详情页
   - 查看 "Deployments" 标签
   - 检查最新部署的状态：
     - ✅ **Ready** - 部署成功
     - ⏳ **Building** - 正在构建
     - ❌ **Error** - 构建失败
     - ⚠️ **Failed** - 部署失败

3. **查看构建日志**
   - 点击失败的部署
   - 查看 "Build Logs" 标签
   - 查找错误信息

### 2. 检查域名配置

从 `frontend/vercel.json` 可以看到，前端配置了 API 代理：

```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://api.hypebot.top/api/:path*"
    }
  ]
}
```

**检查项：**
- ✅ 域名 `www.hypebot.top` 是否正确配置在 Vercel 项目中
- ✅ 域名 DNS 是否正确指向 Vercel
- ✅ SSL 证书是否有效

### 3. 检查环境变量

在 Vercel Dashboard 中检查环境变量：

1. 进入项目设置 → **Environment Variables**
2. 检查以下变量是否配置：
   - `VITE_API_BASE_URL` - 应该设置为 `https://api.hypebot.top/api` 或你的 API 地址
   - 其他必要的环境变量

3. **重要**：确保环境变量在以下环境都已设置：
   - Production（生产环境）
   - Preview（预览环境）
   - Development（开发环境）

### 4. 检查构建配置

从 `vercel.json` 可以看到构建配置：

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite"
}
```

**检查项：**
- ✅ Root Directory 是否设置为 `frontend`（如果项目在子目录）
- ✅ Build Command 是否正确
- ✅ Output Directory 是否正确
- ✅ Framework Preset 是否设置为 Vite

### 5. 检查 API 后端服务

前端代理到 `https://api.hypebot.top/api/:path*`，需要确保：

1. **API 服务是否正常运行**
   ```bash
   curl https://api.hypebot.top/api/health
   ```

2. **CORS 配置是否正确**
   - 后端 API 需要允许来自 `https://www.hypebot.top` 的请求
   - 检查 `API_ALLOWED_ORIGINS` 环境变量

## 常见问题和解决方案

### 问题1: 部署失败 - 构建错误

**症状**: Vercel 部署状态显示 "Error" 或 "Failed"

**解决方案**:
1. 查看构建日志，找到具体错误
2. 常见错误：
   - **依赖安装失败**: 检查 `package.json` 和 `package-lock.json`
   - **构建命令错误**: 检查 `buildCommand` 配置
   - **环境变量缺失**: 检查必需的环境变量

**修复步骤**:
```bash
# 本地测试构建
cd frontend
npm install
npm run build

# 如果本地构建成功，检查 Vercel 配置
# 如果本地构建失败，修复错误后再推送
```

### 问题2: 部署成功但网站无法访问

**症状**: Vercel 显示部署成功，但访问网站显示"网页无法访问"

**可能原因**:
1. **域名 DNS 配置错误**
   - 检查 DNS 记录是否指向 Vercel
   - Vercel 域名配置：项目设置 → Domains

2. **SSL 证书问题**
   - Vercel 会自动配置 SSL，等待几分钟
   - 检查域名是否已正确添加到 Vercel 项目

3. **CDN 缓存问题**
   - 等待 1-5 分钟让 CDN 更新
   - 清除浏览器缓存

**检查步骤**:
```bash
# 检查域名 DNS
nslookup www.hypebot.top

# 检查 Vercel 分配的域名是否可以访问
# 在 Vercel Dashboard 中找到项目的 .vercel.app 域名
# 例如: https://your-project.vercel.app
```

### 问题3: API 请求失败

**症状**: 前端可以访问，但 API 请求失败（404 或 CORS 错误）

**解决方案**:
1. **检查 API 代理配置**
   - 确认 `frontend/vercel.json` 中的 `rewrites` 配置正确
   - 确认 `destination` 地址正确

2. **检查后端 API 服务**
   ```bash
   # 测试 API 是否可访问
   curl https://api.hypebot.top/api/health
   ```

3. **检查 CORS 配置**
   - 后端需要允许来自 `https://www.hypebot.top` 的请求
   - 检查后端 `API_ALLOWED_ORIGINS` 环境变量

### 问题4: 环境变量未生效

**症状**: 前端构建成功，但运行时环境变量不正确

**解决方案**:
1. **在 Vercel Dashboard 中设置环境变量**
   - 项目设置 → Environment Variables
   - 确保在 **Production** 环境中设置

2. **重新部署**
   - 环境变量更改后需要重新部署才能生效
   - 在 Vercel Dashboard 中点击 "Redeploy"

3. **检查环境变量名称**
   - Vite 环境变量必须以 `VITE_` 开头
   - 例如：`VITE_API_BASE_URL`

## 手动触发重新部署

### 方法1: 通过 Git 推送

```bash
# 创建一个空提交来触发重新部署
git commit --allow-empty -m "Trigger Vercel redeploy"
git push
```

### 方法2: 在 Vercel Dashboard

1. 进入项目 → Deployments
2. 找到最新部署
3. 点击 "..." 菜单
4. 选择 "Redeploy"
5. 选择 "Clear Cache and Redeploy"（推荐）

### 方法3: 使用 Vercel CLI

```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录
vercel login

# 在项目根目录
vercel --prod --force
```

## 验证部署

### 1. 检查部署状态

在 Vercel Dashboard 中：
- ✅ 最新部署状态为 "Ready"
- ✅ 构建日志没有错误
- ✅ 部署时间是最新的

### 2. 检查网站可访问性

```bash
# 检查网站是否可以访问
curl -I https://www.hypebot.top

# 应该返回 200 OK
```

### 3. 检查 API 代理

```bash
# 测试 API 代理是否工作
curl https://www.hypebot.top/api/health

# 应该返回 API 的响应
```

### 4. 检查浏览器控制台

1. 打开网站
2. 按 F12 打开开发者工具
3. 查看 Console 标签页
4. 查看 Network 标签页
5. 检查是否有错误

## 快速诊断命令

```bash
# 1. 检查域名 DNS
nslookup www.hypebot.top

# 2. 检查网站可访问性
curl -I https://www.hypebot.top

# 3. 检查 API 服务
curl https://api.hypebot.top/api/health

# 4. 检查 API 代理
curl https://www.hypebot.top/api/health

# 5. 本地测试构建
cd frontend
npm install
npm run build
```

## 联系支持

如果以上步骤都无法解决问题：

1. **查看 Vercel 状态页面**: https://www.vercel-status.com
2. **查看 Vercel 文档**: https://vercel.com/docs
3. **联系 Vercel 支持**: 在 Vercel Dashboard 中提交支持请求

## 检查清单

- [ ] Vercel 部署状态为 "Ready"
- [ ] 构建日志没有错误
- [ ] 域名已正确配置在 Vercel 项目中
- [ ] DNS 记录正确指向 Vercel
- [ ] SSL 证书有效
- [ ] 环境变量已正确设置（Production 环境）
- [ ] API 后端服务正常运行
- [ ] API 代理配置正确
- [ ] CORS 配置正确
- [ ] 浏览器控制台没有错误
- [ ] 网站可以正常访问

