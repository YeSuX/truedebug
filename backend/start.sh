#!/bin/bash

# VibeStepper 后端启动脚本

echo "🚀 启动 VibeStepper 后端服务..."

# 检查Python是否安装
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 未安装，请先安装 Python 3.8+"
    exit 1
fi

# 检查是否在虚拟环境中
if [[ "$VIRTUAL_ENV" == "" ]]; then
    echo "⚠️  建议在虚拟环境中运行"
    echo "创建虚拟环境: python3 -m venv venv"
    echo "激活虚拟环境: source venv/bin/activate"
fi

# 安装依赖
echo "📦 检查并安装依赖..."
pip install -r requirements.txt

# 启动服务
echo "🌟 启动服务器..."
echo "📡 API文档: http://localhost:8000/docs"
echo "🔍 健康检查: http://localhost:8000/health"
echo "按 Ctrl+C 停止服务"

python main.py
