# 前端无法打开诊断指南

## 快速检查步骤

### 1. 检查前端服务是否运行

```bash
# 检查端口 5173 是否被占用
lsof -i:5173
# 或
netstat -tuln | grep 5173

# 检查前端进程
ps aux | grep vite
```

### 2. 检查依赖是否安装

```bash
cd frontend
ls -la node_modules
# 如果 node_modules 不存在或为空，运行:
npm install
```

### 3. 检查配置文件

```bash
cd frontend
# 检查 vite.config.js
cat vite.config.js

# 检查 .env 文件（如果存在）
cat .env
```

### 4. 检查构建错误

```bash
cd frontend
npm run build
```

### 5. 检查浏览器控制台

打开浏览器开发者工具（F12），查看：
- Console 标签页的错误信息
- Network 标签页的请求状态
- 是否有 CORS 错误

## 常见问题和解决方案

### 问题1: 端口被占用

**症状**: 启动时提示端口 5173 已被占用

**解决方案**:
```bash
# 查找占用端口的进程
lsof -ti:5173
# 或
netstat -tuln | grep 5173

# 杀死进程
kill -9 <PID>
# 或
lsof -ti:5173 | xargs kill -9

# 或者使用不同的端口
npm run dev -- --port 5174
```

### 问题2: 依赖未安装或损坏

**症状**: 启动时提示模块未找到

**解决方案**:
```bash
cd frontend
# 删除旧的依赖
rm -rf node_modules package-lock.json

# 重新安装
npm install
```

### 问题3: 构建错误

**症状**: `npm run build` 失败

**解决方案**:
```bash
cd frontend
# 检查 Node.js 版本（需要 >= 18）
node --version

# 清理缓存
npm cache clean --force

# 重新安装依赖
rm -rf node_modules package-lock.json
npm install

# 重新构建
npm run build
```

### 问题4: 浏览器无法连接

**症状**: 浏览器显示 "无法连接到服务器" 或 "ERR_CONNECTION_REFUSED"

**解决方案**:
1. 确认前端服务正在运行: `ps aux | grep vite`
2. 检查防火墙设置
3. 检查 vite.config.js 中的 host 配置
4. 尝试访问 `http://localhost:5173` 而不是 `http://127.0.0.1:5173`

### 问题5: CORS 错误

**症状**: 浏览器控制台显示 CORS 错误

**解决方案**:
1. 检查后端 API 的 CORS 配置
2. 检查 `frontend/.env` 中的 `VITE_API_BASE_URL` 配置
3. 确认后端服务正在运行

### 问题6: 环境变量未设置

**症状**: API 请求失败，提示无法连接到 API

**解决方案**:
```bash
cd frontend
# 检查 .env 文件
cat .env

# 如果不存在，创建 .env 文件
echo "VITE_API_BASE_URL=http://localhost:8000/api" > .env
```

## 使用诊断脚本

运行诊断脚本进行自动检查:

```bash
cd frontend
bash check_frontend.sh
```

## 手动启动步骤

如果诊断脚本没有发现问题，尝试手动启动:

```bash
cd frontend

# 1. 确保依赖已安装
npm install

# 2. 启动开发服务器
npm run dev

# 3. 查看输出，应该显示类似:
#    VITE v7.x.x  ready in xxx ms
#    ➜  Local:   http://localhost:5173/
#    ➜  Network: use --host to expose
```

## 检查后端 API 连接

前端需要连接到后端 API，确保后端服务正在运行:

```bash
# 检查后端服务
ps aux | grep uvicorn
# 或
curl http://localhost:8000/api/health
```

## 查看详细日志

如果问题仍然存在，查看详细日志:

```bash
cd frontend
# 启动时显示详细日志
npm run dev -- --debug

# 或查看浏览器控制台
# 打开浏览器开发者工具 (F12) -> Console 标签页
```

