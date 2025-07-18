# Dia-FastGPT 桌面应用开发指南

## 📋 项目概述

本项目是一个基于 Electron + TypeScript + React 的桌面应用，旨在为 FastGPT 知识库提供系统级快捷键支持。

## 🏗️ 项目架构

### 技术栈
- **主进程 (Main Process)**：Electron + TypeScript + Node.js
- **渲染进程 (Renderer Process)**：React + TypeScript + Ant Design
- **进程通信**：IPC (Inter-Process Communication)
- **状态管理**：React Context + Hooks
- **构建工具**：Vite + TypeScript Compiler
- **代码规范**：ESLint + Prettier

### 目录结构详解

```
src/
├── main/                      # 主进程代码
│   ├── app.ts                # 应用程序入口和主要逻辑
│   ├── shortcut.ts           # 全局快捷键管理
│   ├── tray.ts               # 系统托盘管理
│   ├── window.ts             # 窗口管理
│   ├── content.ts            # 内容获取和处理
│   ├── settings.ts           # 设置持久化存储
│   ├── history.ts            # 历史记录管理
│   └── api/                  # 外部 API 集成
│       └── fastgpt.ts        # FastGPT API 客户端
├── renderer/                 # 渲染进程代码 (React 应用)
│   ├── components/           # 可复用组件
│   ├── pages/               # 页面组件
│   ├── hooks/               # 自定义 React Hooks
│   └── utils/               # 渲染进程工具函数
├── shared/                   # 主进程和渲染进程共享代码
│   ├── types/               # TypeScript 类型定义
│   ├── constants/           # 常量定义
│   └── utils/               # 通用工具函数
└── assets/                   # 静态资源
    └── icons/               # 应用图标
```

## 🚀 开发环境设置

### 1. 环境要求
- Node.js >= 16.0.0
- npm >= 8.0.0 (推荐使用 pnpm)
- Git

### 2. 克隆和安装
```bash
# 进入项目目录
cd Dia-FastGPT桌面应用

# 安装依赖
npm install

# 验证安装
npm run dev
```

### 3. 开发工具配置

#### VSCode 扩展推荐
- **Electron**: ms-vscode.vscode-typescript-next
- **TypeScript**: ms-vscode.vscode-typescript-next
- **ESLint**: dbaeumer.vscode-eslint
- **Prettier**: esbenp.prettier-vscode
- **Auto Rename Tag**: formulahendry.auto-rename-tag

#### VSCode 设置 (.vscode/settings.json)
```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.preferences.importModuleSpecifier": "relative"
}
```

## 💻 开发流程

### 1. 启动开发服务器
```bash
# 启动完整开发环境（主进程 + 渲染进程）
npm run dev

# 仅编译并运行主进程
npm run dev:main

# 仅启动渲染进程开发服务器
npm run dev:renderer
```

### 2. 代码结构规范

#### 主进程模块示例 (src/main/example.ts)
```typescript
import { SomeType } from '../shared/types';
import { SOME_CONSTANT } from '../shared/constants';

export class ExampleManager {
  private someProperty: string;

  constructor() {
    this.someProperty = 'example';
  }

  /**
   * 方法描述
   */
  public async someMethod(): Promise<SomeType> {
    try {
      // 实现逻辑
      return { success: true };
    } catch (error) {
      console.error('Error in someMethod:', error);
      throw error;
    }
  }
}
```

#### 渲染进程组件示例 (src/renderer/components/Example.tsx)
```tsx
import React, { useState, useEffect } from 'react';
import { Button, Card } from 'antd';
import { SomeType } from '../../shared/types';

interface ExampleProps {
  title: string;
  onAction?: () => void;
}

export const Example: React.FC<ExampleProps> = ({ title, onAction }) => {
  const [data, setData] = useState<SomeType | null>(null);

  useEffect(() => {
    // 组件挂载时的逻辑
  }, []);

  const handleClick = () => {
    onAction?.();
  };

  return (
    <Card title={title}>
      <Button onClick={handleClick}>
        执行操作
      </Button>
    </Card>
  );
};
```

### 3. IPC 通信模式

#### 主进程注册处理器
```typescript
// src/main/app.ts
import { ipcMain } from 'electron';
import { IPCChannel } from '../shared/types';

ipcMain.handle(IPCChannel.SOME_ACTION, async (event, data) => {
  try {
    // 处理逻辑
    return { success: true, result: 'data' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
```

#### 渲染进程调用
```typescript
// src/renderer/hooks/useIPC.ts
import { ipcRenderer } from 'electron';
import { IPCChannel } from '../../shared/types';

export const useIPC = () => {
  const callIPC = async (channel: IPCChannel, data?: any) => {
    try {
      const result = await ipcRenderer.invoke(channel, data);
      return result;
    } catch (error) {
      console.error(`IPC call failed for ${channel}:`, error);
      throw error;
    }
  };

  return { callIPC };
};
```

## 🔧 核心功能开发

### 1. 全局快捷键开发

#### 注册快捷键
```typescript
// src/main/shortcut.ts
import { globalShortcut } from 'electron';

export class GlobalShortcutManager {
  register(accelerator: string, callback: () => void): boolean {
    return globalShortcut.register(accelerator, callback);
  }
}
```

#### 快捷键冲突检测
```typescript
isAcceleratorAvailable(accelerator: string): boolean {
  try {
    const testResult = globalShortcut.register(accelerator, () => {});
    if (testResult) {
      globalShortcut.unregister(accelerator);
      return true;
    }
    return false;
  } catch (error) {
    return false;
  }
}
```

### 2. 内容获取和处理

#### 剪贴板操作
```typescript
// src/main/content.ts
import { clipboard } from 'electron';

export class ContentExtractor {
  async getClipboardContent(): Promise<ClipboardContent> {
    return {
      text: clipboard.readText(),
      html: clipboard.readHTML(),
      image: clipboard.readImage().toPNG()
    };
  }
}
```

#### 屏幕截图
```typescript
async captureScreen(): Promise<Uint8Array | null> {
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width: 1920, height: 1080 }
  });
  
  return sources[0]?.thumbnail.toPNG() || null;
}
```

### 3. FastGPT API 集成

#### API 客户端
```typescript
// src/main/api/fastgpt.ts
import axios, { AxiosInstance } from 'axios';

export class FastGPTClient {
  private api: AxiosInstance;

  constructor(config: FastGPTConfig) {
    this.api = axios.create({
      baseURL: config.baseUrl,
      headers: {
        'Authorization': `Bearer ${config.apiKey}`
      }
    });
  }

  async importContent(data: ImportData): Promise<ImportResult> {
    try {
      const response = await this.api.post('/api/core/dataset/data/insertData', {
        datasetId: data.knowledgeBaseId,
        data: [{
          q: '',
          a: data.content,
          source: data.source
        }]
      });
      
      return { success: true, insertId: response.data.insertId };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}
```

## 🧪 测试和调试

### 1. 调试主进程
```bash
# 启动时打开开发者工具
npm run dev -- --inspect

# 在代码中设置断点
debugger;
```

### 2. 调试渲染进程
- 在开发模式下，按 `F12` 或 `Ctrl+Shift+I` 打开开发者工具
- 使用 React Developer Tools

### 3. 日志管理
```typescript
// 统一的日志工具
class Logger {
  static info(message: string, ...args: any[]) {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`, ...args);
  }
  
  static error(message: string, error?: Error) {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, error);
  }
}
```

## 📦 构建和发布

### 1. 构建流程
```bash
# 开发构建
npm run build

# 生产构建
npm run build:prod

# 打包应用
npm run package
```

### 2. 平台特定配置

#### Windows
```json
{
  "win": {
    "target": "nsis",
    "icon": "src/assets/icons/icon.ico"
  }
}
```

#### macOS
```json
{
  "mac": {
    "target": "dmg",
    "icon": "src/assets/icons/icon.icns",
    "category": "public.app-category.productivity"
  }
}
```

#### Linux
```json
{
  "linux": {
    "target": "AppImage",
    "icon": "src/assets/icons/icon.png"
  }
}
```

## 🐛 常见问题和解决方案

### 1. 快捷键在某些应用中不工作
**原因**: 某些应用有更高的快捷键优先级
**解决**: 提供备用快捷键选项

### 2. Electron 安全警告
**原因**: CSP 或 Node 集成配置问题
**解决**: 
```typescript
webPreferences: {
  nodeIntegration: false,
  contextIsolation: true,
  preload: path.join(__dirname, 'preload.js')
}
```

### 3. 打包体积过大
**原因**: 包含了不必要的依赖
**解决**: 
- 使用 `electron-builder` 的文件过滤
- 分离开发依赖和生产依赖

### 4. 跨平台兼容性问题
**原因**: 不同操作系统的 API 差异
**解决**:
```typescript
const platform = process.platform;
if (platform === 'darwin') {
  // macOS 特定代码
} else if (platform === 'win32') {
  // Windows 特定代码
} else {
  // Linux 特定代码
}
```

## 🔄 持续集成

### GitHub Actions 示例
```yaml
name: Build and Release

on:
  push:
    tags: ['v*']

jobs:
  build:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macOS-latest]
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - run: npm install
      - run: npm run build
      - run: npm run package
```

## 📝 贡献指南

### 1. 代码提交规范
```bash
# 格式: type(scope): description
feat(shortcut): add global shortcut support
fix(api): resolve FastGPT connection issue
docs(readme): update installation guide
```

### 2. Pull Request 流程
1. Fork 仓库
2. 创建功能分支
3. 开发并测试
4. 提交 Pull Request
5. 代码审查
6. 合并到主分支

### 3. 代码审查检查清单
- [ ] 代码符合 ESLint 规范
- [ ] 添加了必要的类型注解
- [ ] 包含适当的错误处理
- [ ] 更新了相关文档
- [ ] 通过了所有测试

---

## 📞 支持

如有开发问题，请：
1. 查看本文档
2. 搜索现有 Issues
3. 创建新 Issue 并详细描述问题
4. 联系开发团队

**Happy Coding! 🚀** 