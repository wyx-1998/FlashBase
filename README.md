# FlashBase

一个跨平台的桌面应用，为 FastGPT 知识库提供系统级快捷键支持，闪电般的知识管理体验。

## ✨ 功能特性

### 🚀 核心功能
- **全局快捷键**：在任何应用中都可以使用的系统级快捷键
- **剪贴板导入**：快速导入剪贴板内容到知识库
- **历史记录**：完整的导入历史追踪和管理

### 🎯 快捷键功能
| 快捷键 | 功能 | 描述 |
|--------|------|------|
| `Ctrl+Shift+V` | 剪贴板导入 | 导入剪贴板内容到知识库 |
| `Ctrl+Shift+D` | 显示面板 | 显示快捷操作面板 |

### 🎨 用户界面
- **系统托盘**：常驻系统托盘，提供快速访问菜单
- **主界面**：配置管理和状态监控
- **快捷面板**：悬浮式快捷操作界面
- **设置界面**：完整的配置管理功能

## 🛠️ 技术架构

### 技术栈
- **前端框架**：React + TypeScript
- **桌面框架**：Electron
- **状态管理**：React Hooks + Context
- **UI 组件**：Ant Design
- **样式方案**：Tailwind CSS
- **构建工具**：Vite
- **包管理器**：npm

### 项目结构
```
flashbase/
├── src/
│   ├── main/                 # 主进程代码
│   │   ├── app.ts           # 应用入口
│   │   ├── shortcut.ts      # 快捷键管理
│   │   ├── tray.ts          # 系统托盘
│   │   ├── window.ts        # 窗口管理
│   │   ├── content.ts       # 内容获取
│   │   ├── settings.ts      # 设置管理
│   │   ├── history.ts       # 历史记录
│   │   └── api/             # API 集成
│   │       └── fastgpt.ts   # FastGPT 客户端
│   ├── renderer/            # 渲染进程代码
│   │   ├── components/      # React 组件
│   │   ├── pages/          # 页面组件
│   │   ├── hooks/          # 自定义 Hooks
│   │   └── utils/          # 工具函数
│   ├── shared/             # 共享代码
│   │   ├── types/          # TypeScript 类型
│   │   ├── constants/      # 常量定义
│   │   └── utils/          # 通用工具
│   └── assets/             # 静态资源
├── public/                 # 公共文件
├── build/                  # 构建脚本
└── dist/                   # 构建输出
```

## 🚀 快速开始

### 环境要求
- Node.js >= 16.0.0
- npm >= 8.0.0

### 安装依赖
```bash
npm install
```

### 开发模式
```bash
npm run dev
```

### 构建应用
```bash
# 构建所有平台
npm run build

# 打包应用
npm run package

# 打包所有平台
npm run package:all
```

## ⚙️ 配置说明

### FastGPT 配置
1. 打开设置界面
2. 在 "FastGPT 连接配置" 中填入：
   - **API 地址**：FastGPT 服务器地址
   - **API 密钥**：FastGPT API Key
3. 点击 "测试连接" 验证配置

### 快捷键配置
1. 在设置界面的 "快捷键设置" 中
2. 点击对应的快捷键输入框
3. 按下新的快捷键组合
4. 系统会自动验证快捷键是否可用

### 高级设置
- **开机自启动**：应用随系统启动
- **最小化到托盘**：关闭窗口时最小化到系统托盘
- **启用通知提醒**：导入成功/失败时显示通知
- **自动清理历史记录**：定期清理过期的历史记录

## 🔧 开发指南

### 开发工具推荐
- **IDE**：VSCode + Electron 插件
- **调试**：Chrome DevTools / Electron DevTools
- **代码规范**：ESLint + Prettier

### 本地开发
```bash
# 启动开发服务器
npm run dev

# 仅运行主进程
npm run dev:main

# 仅运行渲染进程
npm run dev:renderer
```

### 代码规范
项目使用 ESLint 和 Prettier 进行代码规范检查：

```bash
# 检查代码规范
npm run lint

# 自动修复代码规范问题
npm run lint:fix

# 格式化代码
npm run format
```

## 📦 打包发布

### 构建流程
1. 编译 TypeScript 代码
2. 打包渲染进程资源
3. 生成 Electron 应用包
4. 创建安装程序

### 支持平台
- **Windows**：`.exe` 安装程序
- **macOS**：`.dmg` 磁盘镜像
- **Linux**：`.AppImage` 应用镜像

### 构建命令
```bash
# 仅构建（不打包）
npm run build

# 打包当前平台
npm run package

# 打包所有平台
npm run package:all

# 打包 Windows
npm run package:win

# 打包 macOS
npm run package:mac

# 打包 Linux
npm run package:linux
```

## 🐛 故障排除

### 常见问题

#### 1. 快捷键无法注册
**原因**：快捷键可能被其他应用占用
**解决**：尝试更换快捷键组合，或关闭占用快捷键的应用

#### 2. FastGPT 连接失败
**原因**：API 地址或密钥配置错误
**解决**：检查配置信息，确保 FastGPT 服务正常运行

#### 3. 截图功能问题
**原因**：系统权限或显示设置问题
**解决**：检查应用的屏幕录制权限

#### 4. 应用无法启动
**原因**：权限不足或依赖缺失
**解决**：以管理员权限运行，重新安装应用

### 日志调试
开发模式下，可以在控制台查看详细日志：
```bash
# 启用调试模式
npm run dev

# 查看主进程日志
# 在 Electron 控制台中查看

# 查看渲染进程日志
# 在浏览器开发者工具中查看
```

## 🤝 贡献指南

欢迎贡献代码！请遵循以下步骤：

1. Fork 项目仓库
2. 创建功能分支：`git checkout -b feature/新功能`
3. 提交更改：`git commit -m '添加新功能'`
4. 推送分支：`git push origin feature/新功能`
5. 创建 Pull Request

### 开发规范
- 使用 TypeScript 编写代码
- 遵循 ESLint 代码规范
- 添加适当的注释和文档
- 编写单元测试（如适用）

## 📄 许可证

本项目采用 [MIT 许可证](LICENSE)。

## 📞 支持与反馈

如有问题或建议，请：
- 提交 [GitHub Issue](https://github.com/your-username/flashbase/issues)
- 发送邮件至：your-email@example.com
- 查看项目文档

## 🙏 致谢

感谢以下开源项目：
- [Electron](https://electronjs.org/) - 跨平台桌面应用框架
- [React](https://reactjs.org/) - 用户界面库
- [Ant Design](https://ant.design/) - 企业级 UI 设计语言
- [TypeScript](https://www.typescriptlang.org/) - JavaScript 的超集
- [Vite](https://vitejs.dev/) - 现代前端构建工具
- [Tailwind CSS](https://tailwindcss.com/) - 实用优先的 CSS 框架

---

**FlashBase** - 闪电般的知识库管理工具 ⚡