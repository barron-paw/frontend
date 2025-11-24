#!/bin/bash

echo "=========================================="
echo "前端诊断脚本"
echo "=========================================="
echo ""

# 检查 Node.js 和 npm
echo "1. 检查 Node.js 和 npm 版本:"
if command -v node &> /dev/null; then
    echo "   ✓ Node.js: $(node --version)"
else
    echo "   ✗ Node.js 未安装"
    exit 1
fi

if command -v npm &> /dev/null; then
    echo "   ✓ npm: $(npm --version)"
else
    echo "   ✗ npm 未安装"
    exit 1
fi
echo ""

# 检查端口占用
echo "2. 检查端口 5173 是否被占用:"
if command -v lsof &> /dev/null; then
    PORT_PID=$(lsof -ti:5173 2>/dev/null)
    if [ -n "$PORT_PID" ]; then
        echo "   ⚠ 端口 5173 被进程 $PORT_PID 占用"
        echo "   进程信息:"
        ps -p $PORT_PID -o pid,cmd 2>/dev/null || echo "   无法获取进程信息"
    else
        echo "   ✓ 端口 5173 未被占用"
    fi
elif command -v netstat &> /dev/null; then
    if netstat -tuln 2>/dev/null | grep -q ":5173"; then
        echo "   ⚠ 端口 5173 被占用"
        netstat -tuln 2>/dev/null | grep ":5173"
    else
        echo "   ✓ 端口 5173 未被占用"
    fi
else
    echo "   ⚠ 无法检查端口占用（需要 lsof 或 netstat）"
fi
echo ""

# 检查 node_modules
echo "3. 检查依赖安装:"
if [ -d "node_modules" ]; then
    echo "   ✓ node_modules 目录存在"
    MODULE_COUNT=$(find node_modules -maxdepth 1 -type d 2>/dev/null | wc -l)
    echo "   已安装 $MODULE_COUNT 个模块"
else
    echo "   ✗ node_modules 目录不存在，需要运行 npm install"
fi
echo ""

# 检查 package.json
echo "4. 检查 package.json:"
if [ -f "package.json" ]; then
    echo "   ✓ package.json 存在"
else
    echo "   ✗ package.json 不存在"
    exit 1
fi
echo ""

# 检查 vite.config.js
echo "5. 检查 vite.config.js:"
if [ -f "vite.config.js" ]; then
    echo "   ✓ vite.config.js 存在"
else
    echo "   ✗ vite.config.js 不存在"
fi
echo ""

# 检查 .env 文件
echo "6. 检查环境变量配置:"
if [ -f ".env" ]; then
    echo "   ✓ .env 文件存在"
    echo "   内容:"
    cat .env | grep -v "PASSWORD\|SECRET\|KEY\|TOKEN" | sed 's/^/     /'
else
    echo "   ⚠ .env 文件不存在（可选）"
fi
echo ""

# 检查构建错误
echo "7. 尝试检查构建:"
if [ -d "node_modules" ]; then
    echo "   运行 npm run build --dry-run 2>&1 | head -20"
    npm run build 2>&1 | head -20 || echo "   构建失败，请查看完整错误信息"
else
    echo "   ⚠ 跳过构建检查（node_modules 不存在）"
fi
echo ""

# 检查进程
echo "8. 检查前端进程:"
if command -v ps &> /dev/null; then
    VITE_PROCESSES=$(ps aux | grep -E "vite|node.*5173" | grep -v grep)
    if [ -n "$VITE_PROCESSES" ]; then
        echo "   找到前端相关进程:"
        echo "$VITE_PROCESSES" | sed 's/^/     /'
    else
        echo "   ⚠ 未找到运行中的前端进程"
    fi
else
    echo "   ⚠ 无法检查进程（需要 ps 命令）"
fi
echo ""

# 检查日志
echo "9. 检查最近的错误日志:"
if [ -f "npm-debug.log" ]; then
    echo "   找到 npm-debug.log:"
    tail -20 npm-debug.log | sed 's/^/     /'
elif [ -f ".vite.log" ]; then
    echo "   找到 .vite.log:"
    tail -20 .vite.log | sed 's/^/     /'
else
    echo "   ✓ 未找到错误日志文件"
fi
echo ""

echo "=========================================="
echo "诊断完成"
echo "=========================================="
echo ""
echo "建议的修复步骤:"
echo "1. 如果端口被占用，运行: kill -9 <PID> 或 lsof -ti:5173 | xargs kill -9"
echo "2. 如果 node_modules 不存在，运行: npm install"
echo "3. 如果依赖有问题，运行: rm -rf node_modules package-lock.json && npm install"
echo "4. 启动前端: npm run dev"
echo "5. 检查浏览器控制台错误信息"

