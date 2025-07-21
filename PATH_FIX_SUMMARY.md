# FlashBase 路径问题修复总结

## 问题描述

打包后的应用报错：`Path: /Applications/FlashBase Dev.app/Contents/Resources/app.asar/dist/dist/renderer/index.html`

出现了双重 `dist` 目录的路径错误。

## 问题根因分析

### 1. 构建配置问题

在 `package.json` 的 `electron-builder` 配置中：

```json
"extraResources": [
  {
    "from": "dist/renderer",
    "to": "renderer"
  }
]
```

这个配置将 `dist/renderer` 目录复制到了打包后的 `renderer` 目录。

### 2. 路径逻辑问题

在 `src/main/window.ts` 中，原来的路径逻辑仍然在寻找：
- 打包环境：`process.resourcesPath + '/renderer/index.html'`
- 但实际代码中还在使用 `dist/renderer/index.html` 的路径

## 解决方案

### 修复文件：`src/main/window.ts`

**修复前的问题代码：**
```typescript
// 检查是否在 app.asar 中
if (process.resourcesPath && process.resourcesPath.includes('.asar')) {
  rendererPath = path.join(process.resourcesPath, 'renderer/index.html');
} else {
  // 开发环境或未打包的情况
  rendererPath = path.join(__dirname, '../../dist/renderer/index.html');
}
```

**修复后的代码：**
```typescript
// 检查是否在打包环境中
if (process.resourcesPath) {
  // 打包后，renderer 文件在 extraResources 中，位于 app/Contents/Resources/renderer/
  rendererPath = path.join(process.resourcesPath, 'renderer/index.html');
} else {
  // 开发环境或未打包的情况
  rendererPath = path.join(__dirname, '../../dist/renderer/index.html');
}
```

### 关键改进点

1. **简化判断逻辑**：只需要检查 `process.resourcesPath` 是否存在，而不需要检查是否包含 `.asar`

2. **增强错误处理**：添加了多个备用路径尝试机制

3. **详细日志输出**：增加了更多调试信息，便于问题排查

4. **多重备用路径**：
   ```typescript
   const fallbackPaths = [
     path.join(__dirname, '../../renderer/index.html'),
     path.join(__dirname, '../renderer/index.html'),
     path.join(process.cwd(), 'dist/renderer/index.html'),
     path.join(process.cwd(), 'renderer/index.html')
   ];
   ```

## 文件结构说明

### 开发环境
```
FlashBase/
├── dist/
│   ├── main/
│   ├── preload/
│   └── renderer/          # Vite 构建输出
│       └── index.html
└── src/
```

### 打包后结构
```
FlashBase Dev.app/
└── Contents/
    ├── MacOS/
    └── Resources/
        ├── app.asar          # 主程序代码
        └── renderer/         # extraResources 复制的文件
            └── index.html
```

## 测试验证

1. **构建测试**：`npm run build` ✅
2. **打包测试**：`npm run package` ✅
3. **应用启动测试**：打包后的应用能正常启动 ✅

## 相关配置文件

- `package.json` - electron-builder 配置
- `vite.config.ts` - 渲染进程构建配置
- `src/main/window.ts` - 窗口管理和路径加载逻辑

## 预防措施

1. **路径一致性**：确保 electron-builder 的 `extraResources` 配置与代码中的路径逻辑保持一致

2. **环境区分**：明确区分开发环境和打包环境的路径处理逻辑

3. **错误处理**：添加充分的备用路径和错误提示

4. **日志记录**：保留详细的路径解析日志，便于问题排查

## 版本记录

- **修复版本**：v1.1.0-dev
- **修复日期**：2024年当前日期
- **影响范围**：macOS 打包应用的渲染进程加载

---

*此文档记录了 FlashBase 应用路径问题的完整解决过程，为后续维护和类似问题提供参考。*