# FlashBase 桌面应用 - 开发指南

## 🚀 快速开始

### 一键启动
```bash
# 推荐方式：使用启动脚本
chmod +x start.sh  # 首次使用需要添加执行权限
./start.sh

# 手动方式：使用npm命令
npm run dev
```

### 停止应用
```bash
# 在终端中按 Ctrl+C 停止应用
# 或者直接关闭应用窗口
```

## 📋 管理命令

### 启动相关
- `./start.sh` - 一键启动应用（推荐）
- `npm run dev` - 手动开发模式启动
- `npm run build` - 构建应用

### 维护相关
- `npm run package` - 打包当前平台
- `npm run package:all` - 打包所有平台

## 🔧 启动流程说明

### 自动化流程
`start.sh` 脚本会自动执行以下步骤：

1. **环境检查** - 检查 Node.js 和 npm 环境
2. **依赖管理** - 自动安装项目依赖
3. **构建应用** - 编译 TypeScript 代码
4. **启动开发服务器** - 启动开发模式，提供热重载
5. **用户提示** - 显示启动状态和操作说明

## 📊 状态监控

### 运行状态
启动脚本会在终端显示实时状态信息：
- 环境检查结果
- 依赖安装进度
- 构建过程输出
- 开发服务器启动状态

### 查看日志
```bash
# 开发模式下，日志直接显示在终端
# Vite 和 Electron 的输出会同时显示

# 如需查看详细调试信息，可以设置环境变量
DEBUG=* ./start.sh
```

### 检查状态
```bash
# 检查应用进程
ps aux | grep -E "(electron|vite)" | grep -v grep

# 检查端口占用（默认5173）
lsof -i :5173

# 检查应用是否正常运行
# 应用启动后会显示在系统托盘
```

## 🛠️ 故障排除

### 常见问题

**1. 端口占用**
- 症状：启动失败，提示端口被占用
- 解决：手动终止占用端口的进程，或使用 `lsof -ti:5173 | xargs kill -9`

**2. 进程残留**
- 症状：新进程无法启动，旧进程仍在运行
- 解决：按 `Ctrl+C` 停止当前进程，或手动终止相关进程

**3. 构建失败**
- 症状：TypeScript 编译错误或依赖问题
- 解决：检查错误信息，必要时删除 `node_modules` 重新运行 `./start.sh`

**4. 环境问题**
- 症状：Node.js 或 npm 版本不兼容
- 解决：启动脚本会自动检查环境，按提示升级相关工具

**5. 权限问题**
- 症状：脚本无法执行
- 解决：运行 `chmod +x start.sh` 添加执行权限

### 手动清理
如果启动脚本无法解决问题：

```bash
# 强制终止所有相关进程
pkill -f "electron"
pkill -f "vite"
pkill -f "npm.*dev"

# 清理端口
lsof -ti:5173 | xargs kill -9

# 重新安装依赖
rm -rf node_modules package-lock.json
./start.sh  # 脚本会自动重新安装依赖
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

### 功能测试
启动后可以测试以下功能：

1. **剪贴板导入** - `Cmd+Shift+V` - 导入剪贴板内容到 FastGPT
2. **文件导入** - `Cmd+Shift+F` - 快速导入文件内容
3. **显示面板** - `Cmd+Shift+D` - 显示/隐藏应用窗口

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