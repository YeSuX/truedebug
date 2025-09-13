#!/bin/bash

# VibeStepper 演示启动脚本

echo "🌈 VibeStepper 协议化调试工具演示"
echo "=================================="

# 检查Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js 16+"
    exit 1
fi

# 检查Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 未安装，请先安装 Python 3.8+"
    exit 1
fi

echo "✅ 环境检查通过"

# 安装前端依赖
echo "📦 安装前端依赖..."
npm install

# 安装后端依赖
echo "📦 安装后端依赖..."
cd backend
pip install -r requirements.txt
cd ..

# 启动后端服务（后台运行）
echo "🚀 启动后端服务..."
cd backend
python main.py &
BACKEND_PID=$!
cd ..

# 等待后端启动
echo "⏳ 等待后端服务启动..."
sleep 3

# 检查后端是否启动成功
if curl -s http://localhost:8000/health > /dev/null; then
    echo "✅ 后端服务启动成功"
else
    echo "❌ 后端服务启动失败"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

# 安装CLI工具
echo "🔧 安装CLI工具..."
npm link

# 初始化演示数据
echo "📋 初始化演示数据..."
vibestepper init

echo ""
echo "🎉 演示环境准备完成！"
echo ""
echo "📖 使用方法："
echo "  1. 运行演示: vibestepper debug bug_report.json"
echo "  2. 或使用演示文件: vibestepper debug demo/bug_report.json"
echo "  3. 查看API文档: http://localhost:8000/docs"
echo ""
echo "🔍 演示文件："
echo "  - demo/buggy.py        # 有bug的示例代码"
echo "  - demo/bug_report.json # 详细的bug报告"
echo "  - demo/test_cases.py   # 测试用例"
echo ""
echo "⚠️  停止服务: kill $BACKEND_PID"
echo ""

# 提示用户
read -p "按回车键开始演示，或按 Ctrl+C 退出..."

# 运行演示
echo "🚀 开始调试演示..."
vibestepper debug demo/bug_report.json

# 清理
echo ""
echo "🧹 清理后台进程..."
kill $BACKEND_PID 2>/dev/null

echo "👋 演示结束，感谢使用 VibeStepper！"
