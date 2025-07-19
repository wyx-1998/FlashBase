# FlashBase 项目结构说明

本文档详细说明了 FlashBase 项目的目录结构和文件组织方式。

## 📁 根目录结构

```
FlashBase/
├── docs/                    # 📚 项目文档目录
├── src/                     # 💻 源代码目录
├── public/                  # 🌐 公共资源目录
├── release/                 # 📦 打包输出目录
├── dist/                    # 🔨 构建输出目录
├── package.json             # 📋 项目配置文件
├── start.sh                 # 🚀 快速启动脚本
├── README.md                # 📖 项目主要说明
└── LICENSE                  # 📄 许可证文件
```

## 📚 docs/ - 文档目录

```
docs/
├── README.md                # 文档索引和使用指南
├── DEVELOPMENT.md           # 详细开发指南
├── DEVELOPMENT_GUIDE.md     # 快速开发指南
├── PROJECT_STATUS.md        # 项目状态跟踪
├── PROJECT_STRUCTURE.md     # 项目结构说明（本文件）
└── STARTUP_ENGINEERING.md   # 启动工程和架构设计
```

### 文档分类说明

- **用户文档**：README.md（主要说明）
- **开发文档**：DEVELOPMENT.md、DEVELOPMENT_GUIDE.md
- **项目管理**：PROJECT_STATUS.md、PROJECT_STRUCTURE.md
- **技术架构**：STARTUP_ENGINEERING.md

## 💻 src/ - 源代码目录

```
src/
├── main/                    # 🔧 Electron 主进程
│   ├── app.ts              # 应用程序入口
│   ├── shortcut.ts         # 全局快捷键管理
│   ├── tray.ts             # 系统托盘管理
│   ├── window.ts           # 窗口管理
│   ├── content.ts          # 内容获取处理
│   ├── settings.ts         # 设置持久化
│   ├── history.ts          # 历史记录管理
│   └── api/                # 外部 API 集成
│       └── fastgpt.ts      # FastGPT API 客户端
├── renderer/               # 🎨 React 渲染进程
│   ├── components/         # React 组件
│   ├── pages/             # 页面组件
│   ├── hooks/             # 自定义 Hooks
│   ├── types/             # TypeScript 类型
│   └── utils/             # 渲染进程工具
├── preload/               # 🔗 预加载脚本
│   └── index.ts           # 主预加载脚本
├── shared/                # 🤝 共享代码
│   ├── types/             # 共享类型定义
│   ├── constants/         # 常量定义
│   └── utils/             # 通用工具函数
└── assets/                # 🎭 静态资源
    └── icons/             # 应用图标
```

### 代码组织原则

1. **进程分离**：主进程、渲染进程、预加载脚本分别组织
2. **功能模块化**：按功能划分模块，便于维护
3. **代码复用**：共享代码统一放在 shared/ 目录
4. **类型安全**：TypeScript 类型定义集中管理

## 🌐 public/ - 公共资源

```
public/
├── index.html              # 渲染进程 HTML 模板
└── icons/                  # 应用图标资源
    ├── icon.png            # 应用主图标
    └── tray/               # 系统托盘图标
```

## 📦 构建和发布目录

### dist/ - 开发构建输出
```
dist/
├── main/                   # 主进程编译输出
├── renderer/               # 渲染进程构建输出
└── preload/               # 预加载脚本输出
```

### release/ - 打包输出
```
release/
├── FlashBase-1.0.0-arm64.dmg    # macOS 安装包
├── FlashBase-1.0.0.exe          # Windows 安装包
├── FlashBase-1.0.0.AppImage     # Linux 应用镜像
└── latest-mac.yml               # 更新配置文件
```

## 🔧 配置文件说明

### 核心配置文件

#### package.json - 项目配置中心
```json
{
  "name": "flashbase",
  "version": "1.0.0",
  "description": "FlashBase - 闪电般的知识库管理工具"
}
```
- **作用**：定义项目元信息、依赖包、构建脚本
- **关键配置**：
  - `scripts`: 开发和构建命令
  - `dependencies`: 运行时依赖
  - `devDependencies`: 开发时依赖
  - `build`: Electron Builder 打包配置

#### tsconfig.json - TypeScript 编译配置
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "jsx": "react-jsx"
  }
}
```
- **作用**：配置 TypeScript 编译器行为
- **关键配置**：
  - `paths`: 路径别名映射（@/*, @main/*, @renderer/*）
  - `outDir`: 编译输出目录
  - `strict`: 严格类型检查

#### vite.config.ts - 前端构建配置
```typescript
export default defineConfig({
  plugins: [react()],
  root: 'src/renderer',
  build: { outDir: 'dist/renderer' }
})
```
- **作用**：配置 Vite 构建工具和开发服务器
- **关键配置**：
  - `root`: 渲染进程根目录
  - `server.port`: 开发服务器端口（5173）
  - `resolve.alias`: 路径别名

### 样式配置文件

#### tailwind.config.js - CSS 框架配置
```javascript
module.exports = {
  content: ["./src/renderer/**/*.{js,ts,jsx,tsx}"],
  theme: { extend: { colors: { primary: {...} } } }
}
```
- **作用**：配置 Tailwind CSS 样式框架
- **关键配置**：
  - `content`: 扫描样式类的文件路径
  - `theme.extend`: 自定义主题色彩
  - `corePlugins.preflight: false`: 避免与 Ant Design 冲突

#### postcss.config.js - CSS 后处理配置
```javascript
module.exports = {
  plugins: { tailwindcss: {}, autoprefixer: {} }
}
```
- **作用**：配置 CSS 后处理插件
- **功能**：自动添加浏览器前缀、处理 Tailwind CSS

### 开发工具配置

#### .gitignore - 版本控制忽略文件
- **作用**：指定 Git 忽略的文件和目录
- **包含**：node_modules、dist、build、日志文件等

#### start.sh - 快速启动脚本
- **作用**：一键启动开发环境
- **功能**：环境检查、依赖安装、应用构建、服务启动

#### package-lock.json - 依赖锁定文件
- **作用**：锁定依赖包的确切版本
- **重要性**：确保团队开发环境一致性

## 🚀 快速导航

### 新手开发者
1. 查看 [README.md](../README.md) 了解项目
2. 运行 `./start.sh` 快速启动
3. 阅读 [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md)

### 经验开发者
1. 查看 [DEVELOPMENT.md](./DEVELOPMENT.md) 了解架构
2. 直接进入 `src/` 目录开始开发
3. 参考 [STARTUP_ENGINEERING.md](./STARTUP_ENGINEERING.md)

### 项目维护者
1. 更新 [PROJECT_STATUS.md](./PROJECT_STATUS.md)
2. 维护文档同步更新
3. 管理发布流程

## 📝 最佳实践

### 文件命名
- 使用 kebab-case 命名文件和目录
- TypeScript 文件使用 .ts/.tsx 扩展名
- 组件文件使用 PascalCase 命名

### 目录组织
- 按功能而非文件类型组织代码
- 保持目录层级不超过 3 层
- 相关文件放在同一目录下

### 文档维护
- 代码变更时同步更新文档
- 保持文档结构清晰简洁
- 使用相对路径引用其他文档

---

**注意**：项目结构可能随着开发进展而调整，请以实际目录结构为准。