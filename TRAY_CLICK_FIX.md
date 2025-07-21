# 托盘点击闪退问题修复

## 问题描述

用户反馈在DMG安装后，应用程序仍然存在"软件在运行，但是菜单栏自动闪退"的问题。尽管之前已经修复了DMG安装的配置问题，但托盘图标点击后窗口显示仍不稳定。

## 问题分析

### 根本原因

1. **窗口显示竞态条件**：
   - `showMainWindow()` 方法在创建新窗口后立即调用 `show()` 和 `focus()`
   - 但窗口创建时设置了 `show: false`，依赖 `ready-to-show` 事件
   - 这导致了竞态条件，可能出现窗口创建但不显示的情况

2. **Dock图标管理不一致**：
   - 托盘点击和窗口显示中的Dock图标处理逻辑分散
   - 缺乏统一的窗口状态管理

3. **窗口焦点处理不够强制**：
   - 在某些情况下窗口虽然显示但没有获得焦点
   - 缺乏强制置顶的机制

## 解决方案

### 1. 优化窗口显示逻辑

**文件**: `src/main/window.ts`

```typescript
/**
 * 显示主窗口
 */
showMainWindow(): void {
  if (!this.mainWindow) {
    this.createMainWindow();
    // 新创建的窗口会通过 ready-to-show 事件自动显示
    return;
  }
  
  // 如果窗口已存在，直接显示并聚焦
  if (this.mainWindow.isMinimized()) {
    this.mainWindow.restore();
  }
  
  this.mainWindow.show();
  this.mainWindow.focus();
  
  // 在 macOS 上确保 Dock 图标可见
  if (process.platform === 'darwin') {
    const { app } = require('electron');
    app.dock?.show();
  }
}
```

**关键改进**：
- 分离新窗口创建和已存在窗口的显示逻辑
- 新窗口依赖 `ready-to-show` 事件自动显示
- 已存在窗口立即显示并处理最小化状态
- 统一的Dock图标管理

### 2. 增强托盘点击处理

**文件**: `src/main/tray.ts`

```typescript
// 托盘点击事件
this.tray.on('click', () => {
  console.log('Tray clicked, showing main window');
  
  // 在 macOS 上先显示 Dock 图标
  if (process.platform === 'darwin') {
    app.dock?.show();
    console.log('Dock icon shown');
  }
  
  // 显示主窗口（内部已包含 Dock 图标处理）
  this.windowManager?.showMainWindow();
  
  // 额外确保窗口获得焦点
  setTimeout(() => {
    const mainWindow = this.windowManager?.getMainWindow();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.focus();
      mainWindow.moveTop();
      console.log('Main window focused and moved to top');
    }
  }, 100);
});
```

**关键改进**：
- 添加详细的调试日志
- 双重Dock图标显示保证
- 延迟强制焦点和置顶
- 窗口状态检查防止错误

## 技术原理

### 窗口生命周期管理

1. **创建阶段**：
   ```
   new BrowserWindow({show: false}) → ready-to-show → 自动显示
   ```

2. **显示阶段**：
   ```
   检查窗口状态 → 恢复最小化 → 显示 → 聚焦 → 置顶
   ```

### macOS Dock图标管理

1. **隐藏时机**：窗口全部关闭时自动隐藏
2. **显示时机**：
   - 托盘点击时立即显示
   - 窗口显示方法中确保显示
   - activate事件中显示

### 焦点管理策略

1. **立即焦点**：`window.focus()`
2. **强制置顶**：`window.moveTop()`
3. **延迟确保**：100ms后再次检查和设置

## 验证方法

### 测试场景

1. **基本功能测试**：
   ```bash
   # 安装DMG后测试
   1. 启动应用
   2. 关闭主窗口
   3. 点击托盘图标
   4. 验证窗口正常显示并获得焦点
   ```

2. **边界情况测试**：
   ```bash
   # 测试各种窗口状态
   1. 窗口最小化后点击托盘
   2. 窗口隐藏后点击托盘
   3. 多次快速点击托盘图标
   4. 在不同桌面空间中测试
   ```

3. **Dock图标测试**：
   ```bash
   # 验证Dock图标行为
   1. 关闭窗口后Dock图标应隐藏
   2. 点击托盘后Dock图标应显示
   3. 点击Dock图标应正常显示窗口
   ```

### 日志检查

在控制台中查看以下日志：
```
Tray clicked, showing main window
Dock icon shown
Main window focused and moved to top
```

## 注意事项

### 开发环境
- 修复主要针对生产环境的DMG安装版本
- 开发环境可能表现不同，以DMG安装版本为准

### 系统兼容性
- 主要针对macOS系统优化
- Windows和Linux系统的托盘行为可能不同

### 性能考虑
- 添加了100ms的延迟确保机制
- 对性能影响微乎其微
- 提高了用户体验的稳定性

## 预防措施

### 代码规范
1. 窗口状态检查：始终检查窗口是否存在且未销毁
2. 平台特定代码：使用 `process.platform` 进行平台判断
3. 异步操作：使用适当的延迟确保操作完成

### 测试要求
1. 每次修改窗口管理代码后必须测试DMG安装版本
2. 在不同macOS版本上进行兼容性测试
3. 测试各种窗口状态转换场景

---

**修复版本**: v1.1.0-dev  
**修复日期**: 2024年12月  
**影响范围**: macOS DMG安装版本的托盘交互体验