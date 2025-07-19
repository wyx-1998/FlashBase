#!/bin/bash

# FlashBase 快速启动脚本
# 作者: Dia Team
# 版本: 1.0.0

echo "🚀 启动 FlashBase 开发环境..."
echo "=============================="

# 检查 Node.js 是否安装
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未找到 Node.js，请先安装 Node.js (>= 16.0.0)"
    echo "下载地址: https://nodejs.org/"
    exit 1
fi

# 检查 npm 是否安装
if ! command -v npm &> /dev/null; then
    echo "❌ 错误: 未找到 npm，请先安装 npm"
    exit 1
fi

# 显示版本信息
echo "📋 环境信息:"
echo "Node.js 版本: $(node --version)"
echo "npm 版本: $(npm --version)"
echo ""

# 检查是否存在 node_modules
if [ ! -d "node_modules" ]; then
    echo "📦 首次运行，正在安装依赖..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ 依赖安装失败，请检查网络连接或手动运行 npm install"
        exit 1
    fi
    echo "✅ 依赖安装完成"
else
    echo "✅ 依赖已存在，跳过安装"
fi

echo ""
echo "🔧 正在构建应用..."

# 构建应用
npm run build
if [ $? -ne 0 ]; then
    echo "❌ 构建失败，请检查代码"
    exit 1
fi

echo "✅ 构建完成"
echo ""
echo "🎯 启动开发服务器..."
echo "提示: 按 Ctrl+C 停止服务器"
echo ""

# 启动开发服务器
npm run dev