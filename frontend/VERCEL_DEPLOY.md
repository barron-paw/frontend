# Vercel 重新部署指南

## 问题
代码已更新，但 Vercel 部署没有变化，前端还是显示旧版本。

## 解决方法

### 方法1：通过 Git 推送触发重新部署（推荐）

1. **提交代码到 Git**
   ```bash
   git add .
   git commit -m "Update: Change trade count to days, fix black screen issue"
   git push
   ```

2. **Vercel 会自动检测到推送并重新部署**
   - 等待 Vercel 完成构建（通常 1-3 分钟）
   - 在 Vercel Dashboard 查看部署状态

### 方法2：在 Vercel Dashboard 手动触发重新部署

1. 登录 [Vercel Dashboard](https://vercel.com/dashboard)
2. 找到你的项目（hypebot 或 frontend）
3. 点击项目进入详情页
4. 点击 "Deployments" 标签
5. 找到最新的部署，点击右侧的 "..." 菜单
6. 选择 "Redeploy"
7. 在弹出窗口中选择 "Use existing Build Cache" 或 "Clear Cache and Redeploy"（推荐选择清除缓存）

### 方法3：使用 Vercel CLI 重新部署

```bash
# 安装 Vercel CLI（如果还没安装）
npm i -g vercel

# 在 frontend 目录下
cd frontend

# 登录 Vercel
vercel login

# 重新部署（清除缓存）
vercel --prod --force
```

### 方法4：清除 Vercel 构建缓存

1. 在 Vercel Dashboard 中进入项目设置
2. 找到 "Build & Development Settings"
3. 在 "Build Command" 或 "Output Directory" 中临时添加一个注释
4. 保存设置（这会触发重新部署）
5. 或者直接点击 "Redeploy" 并选择 "Clear Cache and Redeploy"

## 验证部署是否成功

### 1. 检查 Vercel 部署日志
- 在 Vercel Dashboard 中查看最新的部署
- 确认构建成功（没有错误）
- 查看构建日志，确认文件已更新

### 2. 检查网站版本
- 访问网站后，按 `F12` 打开开发者工具
- 在 Console 中运行：
  ```javascript
  document.querySelector('meta[name="version"]')?.content
  ```
- 应该显示：`2024.11.17.4`

### 3. 检查代码内容
- 查看页面源代码（右键 → 查看页面源代码）
- 搜索 "交易天数"，应该能找到
- 如果还是 "交易笔数"，说明部署还没更新

## 强制清除浏览器缓存

即使 Vercel 已更新，浏览器可能还有缓存：

1. **强制刷新**：`Ctrl + Shift + R` (Windows) 或 `Cmd + Shift + R` (Mac)
2. **清除缓存**：`Ctrl + Shift + Delete` → 选择"缓存的图片和文件" → 清除
3. **无痕模式**：打开无痕窗口测试

## 常见问题

### Q: Vercel 部署成功但网站还是旧版本？
A: 
1. 等待 1-2 分钟（CDN 缓存更新需要时间）
2. 清除浏览器缓存
3. 检查是否正确推送到 Git 主分支

### Q: 如何确认代码已推送到 Git？
A:
```bash
git log --oneline -5
```
查看最近的提交记录

### Q: Vercel 构建失败怎么办？
A:
1. 查看 Vercel Dashboard 中的构建日志
2. 检查是否有编译错误
3. 确认所有依赖都已安装

## 快速检查清单

- [ ] 代码已提交到 Git
- [ ] Git 已推送到远程仓库
- [ ] Vercel 检测到新的推送
- [ ] Vercel 构建成功（无错误）
- [ ] 等待 1-2 分钟让 CDN 更新
- [ ] 清除浏览器缓存
- [ ] 强制刷新页面（Ctrl + Shift + R）
- [ ] 验证版本号是否为 `2024.11.17.4`
- [ ] 验证显示的是"交易天数"而不是"交易笔数"

