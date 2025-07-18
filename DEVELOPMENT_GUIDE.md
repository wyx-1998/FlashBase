# Dia-FastGPT 桌面应用 - 开发指南

## 🚀 快速开始

### 一键启动
```bash
# 方法1: 使用脚本
./start.sh

# 方法2: 使用npm
npm start
```

### 停止应用
```bash
# 方法1: 使用脚本
./stop.sh

# 方法2: 使用npm
npm stop
```

## 📋 管理命令

### 启动相关
- `./start.sh` - 一键启动应用（推荐）
- `npm start` - 同上
- `npm run dev` - 手动开发模式启动
- `npm run build` - 构建应用

### 维护相关
- `./stop.sh` - 停止应用
- `./status.sh` - 检查应用状态
- `npm run package` - 打包应用

## 🔧 启动流程说明

### 自动化流程
`start.sh` 脚本会自动执行以下步骤：

1. **环境检查**
   - 检查 Node.js 和 npm 是否安装
   - 检查项目依赖是否完整
   - 自动安装缺失的依赖

2. **清理工作**
   - 检查并清理端口占用（5173）
   - 终止旧的进程（Electron、Vite）
   - 清理相关的 npm 进程

3. **构建应用**
   - 编译 TypeScript 代码
   - 构建渲染进程文件
   - 验证构建结果

4. **启动服务**
   - 启动 Vite 开发服务器（渲染进程）
   - 启动 Electron 主进程
   - 验证启动状态

5. **状态反馈**
   - 显示运行状态
   - 提供日志文件位置
   - 列出可用功能和管理命令

## 📊 状态监控

### 日志文件
启动后会生成以下日志文件：
- `/tmp/dia-fastgpt-vite.log` - Vite 渲染服务器日志
- `/tmp/dia-fastgpt-electron.log` - Electron 主进程日志

### 查看日志
```bash
# 实时查看所有日志
tail -f /tmp/dia-fastgpt-*.log

# 查看特定日志
tail -f /tmp/dia-fastgpt-vite.log      # Vite日志
tail -f /tmp/dia-fastgpt-electron.log  # Electron日志
```

### 检查状态
```bash
# 检查应用进程
ps aux | grep -E "(electron|vite)" | grep -v grep

# 检查端口占用
lsof -i :5173

# 使用状态脚本
./status.sh  # 如果可用
```

## 🛠️ 故障排除

### 常见问题

**1. 端口占用**
- 症状：启动失败，提示端口被占用
- 解决：脚本会自动清理端口，如果仍有问题，手动运行 `./stop.sh`

**2. 进程残留**
- 症状：新进程无法启动，旧进程仍在运行
- 解决：运行 `./stop.sh` 强制清理所有进程

**3. 构建失败**
- 症状：TypeScript 编译错误或依赖问题
- 解决：检查错误信息，必要时删除 `node_modules` 重新安装

**4. Electron 启动失败**
- 症状：渲染服务器正常，但主进程无法启动
- 解决：查看 `/tmp/dia-fastgpt-electron.log` 日志文件

### 手动清理
如果自动脚本无法解决问题：

```bash
# 强制终止所有相关进程
pkill -f "electron.*app.js"
pkill -f "vite.*renderer"
pkill -f "npm.*dev"

# 清理端口
lsof -ti:5173 | xargs kill -9

# 重新安装依赖
rm -rf node_modules package-lock.json
npm install
```

## 🔧 开发模式

### 调试模式
```bash
# 启用详细日志
DEBUG=* ./start.sh

# 开发模式环境变量
NODE_ENV=development ./start.sh
```

### 热重载
- **渲染进程**：Vite 提供热重载，修改前端代码会自动刷新
- **主进程**：修改主进程代码需要重启应用

### 开发工具
- **渲染进程调试**：在应用中按 `Cmd+Option+I`（Mac）打开开发者工具
- **主进程调试**：查看终端输出或日志文件

## 📝 功能测试

### 快捷键测试
启动后可以测试以下功能：

1. **剪贴板导入** - `Cmd+Shift+V`
   - 复制文本到剪贴板
   - 按快捷键导入到 FastGPT

2. **显示面板** - `Cmd+Shift+D`
   - 显示/隐藏应用窗口

3. **截图导入** - `Cmd+Shift+S`
   - 截图并导入到知识库

4. **快速导入** - `Cmd+Shift+F`
   - 快速导入选中内容

### 连接测试
- 在设置页面点击"测试连接"验证 FastGPT 服务器连接
- 检查知识库列表是否正常加载

## 🎯 最佳实践

1. **使用一键启动**：始终使用 `./start.sh` 而不是手动启动
2. **正确停止**：使用 `./stop.sh` 优雅关闭应用
3. **监控日志**：遇到问题时查看日志文件
4. **定期清理**：定期清理日志文件和临时文件
5. **版本控制**：不要将日志文件和临时文件提交到版本控制

## 📦 部署准备

### 打包应用
```bash
# 构建并打包
npm run build
npm run package

# 打包所有平台
npm run package:all
```

### 发布检查
- 确保所有功能正常
- 验证快捷键工作正常
- 测试 FastGPT 连接
- 检查错误处理 