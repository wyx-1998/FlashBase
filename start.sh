#!/bin/bash

# FlashBase 快速启动脚本
# 作者: 小伢儿 Team
# 版本: 1.0.0

echo "🚀 启动 FlashBase 开发环境..."
echo "=============================="

# 定义端口和进程名称
VITE_PORT=5173
ELECTRON_PROCESS="electron"
APP_NAME="FlashBase"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 检查端口是否被占用
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # 端口被占用
    else
        return 1  # 端口空闲
    fi
}

# 杀死占用端口的进程
kill_port_process() {
    local port=$1
    local pid=$(lsof -ti:$port)
    if [ ! -z "$pid" ]; then
        print_warning "端口 $port 被进程 $pid 占用，正在终止..."
        kill -9 $pid 2>/dev/null
        sleep 2
        if check_port $port; then
            print_error "无法终止占用端口 $port 的进程"
            return 1
        else
            print_success "已释放端口 $port"
            return 0
        fi
    fi
}

# 清理旧的进程
cleanup_processes() {
    print_info "检查并清理旧的进程..."
    
    # 查找并终止旧的 Electron 进程
    local electron_pids=$(pgrep -f "$ELECTRON_PROCESS.*$APP_NAME|$ELECTRON_PROCESS.*flashbase" 2>/dev/null)
    if [ ! -z "$electron_pids" ]; then
        print_warning "发现旧的 Electron 进程，正在清理..."
        echo "$electron_pids" | xargs kill -9 2>/dev/null
        sleep 1
        print_success "已清理 Electron 进程"
    fi
    
    # 检查并处理端口占用
    if check_port $VITE_PORT; then
        print_warning "检测到端口 $VITE_PORT 被占用"
        read -p "是否要终止占用端口的进程？(y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            kill_port_process $VITE_PORT
        else
            print_error "端口 $VITE_PORT 被占用，无法启动开发服务器"
            exit 1
        fi
    fi
}

# 检查 Node.js 是否安装
check_nodejs() {
    if ! command -v node &> /dev/null; then
        print_error "未找到 Node.js，请先安装 Node.js (>= 16.0.0)"
        echo "下载地址: https://nodejs.org/"
        exit 1
    fi
    
    # 检查 Node.js 版本
    local node_version=$(node --version | sed 's/v//')
    local major_version=$(echo $node_version | cut -d. -f1)
    if [ "$major_version" -lt 16 ]; then
        print_error "Node.js 版本过低 ($node_version)，需要 >= 16.0.0"
        exit 1
    fi
}

# 检查 npm 是否安装
check_npm() {
    if ! command -v npm &> /dev/null; then
        print_error "未找到 npm，请先安装 npm"
        exit 1
    fi
}

# 执行环境检查
print_info "检查运行环境..."
check_nodejs
check_npm

# 清理旧进程
cleanup_processes

# 显示版本信息
print_success "环境检查通过"
echo "📋 环境信息:"
echo "Node.js 版本: $(node --version)"
echo "npm 版本: $(npm --version)"
echo "工作目录: $(pwd)"
echo ""

# 检查依赖完整性
check_dependencies() {
    print_info "检查项目依赖..."
    
    # 检查 package.json 是否存在
    if [ ! -f "package.json" ]; then
        print_error "未找到 package.json 文件，请确认在正确的项目目录中"
        exit 1
    fi
    
    # 检查是否存在 node_modules
    if [ ! -d "node_modules" ]; then
        print_warning "首次运行，正在安装依赖..."
        npm install
        if [ $? -ne 0 ]; then
            print_error "依赖安装失败，请检查网络连接或手动运行 npm install"
            exit 1
        fi
        print_success "依赖安装完成"
    else
        # 检查依赖是否需要更新
        if [ "package.json" -nt "node_modules" ] || [ "package-lock.json" -nt "node_modules" ]; then
            print_warning "检测到依赖可能需要更新，正在重新安装..."
            npm install
            if [ $? -ne 0 ]; then
                print_error "依赖更新失败"
                exit 1
            fi
            print_success "依赖更新完成"
        else
            print_success "依赖检查通过"
        fi
    fi
}

# 构建应用
build_app() {
    print_info "构建应用..."
    
    # 清理旧的构建文件
    if [ -d "dist" ]; then
        print_info "清理旧的构建文件..."
        rm -rf dist
    fi
    
    # 执行构建
    npm run build
    if [ $? -ne 0 ]; then
        print_error "构建失败，请检查代码"
        exit 1
    fi
    
    print_success "构建完成"
}

# 启动开发服务器
start_dev_server() {
    print_info "启动开发服务器..."
    print_warning "开发服务器将在端口 $VITE_PORT 启动"
    echo "提示: 按 Ctrl+C 停止服务器"
    echo ""
    
    # 设置错误处理
    trap 'print_warning "正在停止服务器..."; cleanup_processes; exit 0' INT TERM
    
    # 启动开发服务器
    npm run dev
    
    # 如果到达这里，说明服务器异常退出
    local exit_code=$?
    if [ $exit_code -ne 0 ]; then
        print_error "开发服务器异常退出 (退出码: $exit_code)"
        print_info "常见问题排查:"
        echo "  1. 检查端口 $VITE_PORT 是否被占用"
        echo "  2. 检查 Node.js 和 npm 版本是否符合要求"
        echo "  3. 尝试删除 node_modules 文件夹后重新运行"
        echo "  4. 检查防火墙设置"
        exit $exit_code
    fi
}

# 主执行流程
print_info "开始启动流程..."
check_dependencies
build_app
echo ""
start_dev_server