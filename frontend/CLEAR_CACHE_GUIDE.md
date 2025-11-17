# 清除浏览器缓存指南

## 问题
如果前端显示的还是旧版本（例如"交易笔数"而不是"交易天数"），或者点击模拟后黑屏，可能是浏览器缓存问题。

## 解决方法

### 方法1：强制刷新（推荐）
1. **Windows/Linux**: 按 `Ctrl + Shift + R` 或 `Ctrl + F5`
2. **Mac**: 按 `Cmd + Shift + R`
3. 这会强制浏览器重新加载所有资源，忽略缓存

### 方法2：清除浏览器缓存
1. 按 `Ctrl + Shift + Delete` (Windows) 或 `Cmd + Shift + Delete` (Mac)
2. 选择"缓存的图片和文件"或"Cached images and files"
3. 时间范围选择"全部时间"或"All time"
4. 点击"清除数据"或"Clear data"

### 方法3：使用无痕/隐私模式
1. 打开浏览器的无痕/隐私模式
   - Chrome/Edge: `Ctrl + Shift + N` (Windows) 或 `Cmd + Shift + N` (Mac)
   - Firefox: `Ctrl + Shift + P` (Windows) 或 `Cmd + Shift + P` (Mac)
2. 访问网站测试

### 方法4：清除特定网站的缓存
1. 按 `F12` 打开开发者工具
2. 右键点击浏览器地址栏的刷新按钮
3. 选择"清空缓存并硬性重新加载"或"Empty Cache and Hard Reload"

## 检查是否已更新

### 1. 检查版本号
- 打开浏览器开发者工具（F12）
- 在 Console 中输入：`document.querySelector('meta[name="version"]')?.content`
- 应该显示：`2024.11.17.4`

### 2. 检查代码
- 查看页面源代码（右键 → 查看页面源代码）
- 搜索"交易天数"，应该能找到"交易天数（最多30天）"
- 如果找到"交易笔数（最多30笔）"，说明还是旧版本

### 3. 检查控制台日志
- 打开开发者工具（F12）→ Console 标签
- 点击"开始模拟"按钮
- 应该能看到 `[SimulatedFollowPanel]` 开头的日志
- 如果有错误，会显示详细的错误信息

## 如果还是不行

### 检查部署状态
1. 确认代码已经提交到 Git
2. 确认 Vercel（或其他部署平台）已经重新部署
3. 检查部署日志，确认构建成功

### 检查后端 API
1. 打开开发者工具（F12）→ Network 标签
2. 点击"开始模拟"按钮
3. 查看 `/api/simulated-follow` 请求
4. 检查响应内容，应该包含 `dailyProfits` 字段，而不是 `trades` 字段

### 手动测试 API
在浏览器控制台运行：
```javascript
fetch('/api/simulated-follow?address=0xc1fad979fdb44abcfd1f86836ffed7b8221cc60a&days=7')
  .then(r => r.json())
  .then(data => console.log('API Response:', data))
  .catch(err => console.error('API Error:', err))
```

如果返回的数据包含 `dailyProfits` 字段，说明后端已更新。
如果返回的数据包含 `trades` 字段，说明后端还是旧版本。

