# macOS Dock 图标闪退问题修复

## 问题描述

用户安装 DMG 文件后，在应用栏（Dock）会自动闪退，但是程序却没有退出。这是一个典型的 macOS 应用行为问题。

## 问题分析

### 现象
- 应用在 Dock 中显示为闪退（应用图标消失）
- 但程序实际还在后台运行
- 只能通过系统托盘访问应用
- 用户体验不符合 macOS 常规应用习惯

### 根本原因
应用被设计为在关闭窗口时隐藏到系统托盘，而不是完全退出。在 macOS 上，这种行为需要特殊处理以符合用户期望。

## 解决方案

### 1. 优化 `window-all-closed` 事件处理

**文件：** `src/main/app.ts`

**修复前：**
```typescript
app.on('window-all-closed', () => {
  // 在所有平台上都保持应用运行，通过托盘管理
  console.log('All windows closed, app continues running in tray');
  
  // 在 macOS 上隐藏 Dock 图标
  if (process.platform === 'darwin') {
    app.dock?.hide();
  }
});
```

**修复后：**
```typescript
app.on('window-all-closed', () => {
  // 在 macOS 上的特殊处理：保持应用运行但隐藏 Dock 图标
  if (process.platform === 'darwin') {
    // 不退出应用，只是隐藏 Dock 图标，应用继续在托盘中运行
    console.log('All windows closed on macOS, hiding dock icon, app continues in tray');
    app.dock?.hide();
  } else {
    // 在其他平台上，保持应用运行
    console.log('All windows closed, app continues running in tray');
  }
});
```

### 2. 优化托盘点击行为

**文件：** `src/main/tray.ts`

**修复前：**
```typescript
this.tray.on('click', () => {
  this.windowManager?.showMainWindow();
  
  // 在 macOS 上显示 Dock 图标
  if (process.platform === 'darwin') {
    app.dock?.show();
  }
});
```

**修复后：**
```typescript
this.tray.on('click', () => {
  // 在 macOS 上先显示 Dock 图标，再显示窗口
  if (process.platform === 'darwin') {
    app.dock?.show();
  }
  
  this.windowManager?.showMainWindow();
  
  // 确保窗口获得焦点
  if (this.windowManager?.getMainWindow()) {
    this.windowManager.getMainWindow()?.focus();
  }
});
```

### 3. 优化 activate 事件处理

**文件：** `src/main/app.ts`

**修复前：**
```typescript
app.on('activate', () => {
  this.windowManager.showMainWindow();
});
```

**修复后：**
```typescript
app.on('activate', () => {
  // macOS 特有事件：当用户点击 Dock 图标时触发
  console.log('App activated (Dock icon clicked)');
  
  // 确保 Dock 图标可见
  if (process.platform === 'darwin') {
    app.dock?.show();
  }
  
  // 显示主窗口
  this.windowManager.showMainWindow();
});
```

## 技术要点

### macOS 应用生命周期

1. **window-all-closed**：所有窗口关闭时触发
   - 在 macOS 上，应用通常不会退出，而是隐藏 Dock 图标
   - 应用继续在后台运行，可通过托盘或其他方式重新激活

2. **activate**：macOS 特有事件
   - 当用户点击 Dock 图标时触发
   - 需要重新显示 Dock 图标和主窗口

3. **Dock 图标管理**：
   - `app.dock?.hide()`：隐藏 Dock 图标
   - `app.dock?.show()`：显示 Dock 图标

### 用户体验优化

1. **操作顺序**：先显示 Dock 图标，再显示窗口
2. **焦点管理**：确保窗口获得焦点
3. **状态同步**：托盘和 Dock 图标状态保持一致

## 测试验证

### 测试场景

1. **关闭窗口测试**：
   - 点击窗口关闭按钮
   - 验证：Dock 图标消失，应用继续在托盘运行

2. **托盘恢复测试**：
   - 点击系统托盘图标
   - 验证：Dock 图标重新出现，主窗口显示并获得焦点

3. **Dock 激活测试**：
   - 在 Dock 图标可见时点击它
   - 验证：主窗口正常显示并获得焦点

4. **应用退出测试**：
   - 通过托盘菜单选择退出
   - 验证：应用完全退出，Dock 图标消失

### 预期行为

✅ **正常行为**：
- 关闭窗口时，Dock 图标消失但应用继续运行
- 点击托盘图标时，Dock 图标重新出现，窗口正常显示
- 用户可以通过托盘菜单完全退出应用
- 符合 macOS 用户的使用习惯

❌ **异常行为（已修复）**：
- Dock 图标闪退但程序未退出
- 点击托盘后 Dock 图标不出现
- 窗口显示但无法获得焦点

## 相关文件

- `src/main/app.ts` - 应用生命周期管理
- `src/main/tray.ts` - 系统托盘管理
- `src/main/window.ts` - 窗口管理

## 版本记录

- **修复版本**：v1.1.0-dev
- **修复日期**：2024年当前日期
- **影响范围**：macOS 平台的 Dock 图标行为
- **兼容性**：不影响其他平台的正常使用

---

*此修复确保了 FlashBase 在 macOS 上的用户体验符合平台规范，解决了 Dock 图标闪退的困扰。*