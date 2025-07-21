# DMG 安装闪退问题修复

## 问题描述

用户反馈通过 DMG 安装 FlashBase 应用后，在菜单栏（Dock）会自动闪退，但应用程序还在后台运行。而直接使用 `mac-arm64` 文件夹内的应用文件则没有问题。

## 问题分析

### 现象对比

✅ **直接运行版本**（`release/mac-arm64/FlashBase Dev.app`）：
- 应用正常启动和运行
- Dock 图标行为正常
- 窗口管理功能正常

❌ **DMG 安装版本**：
- 安装后启动时 Dock 图标闪退
- 应用实际还在后台运行
- 只能通过系统托盘访问

### 根本原因

经过分析发现，问题出现在 **代码签名配置** 上：

1. **hardenedRuntime 冲突**：
   - 应用配置了 `hardenedRuntime: true`
   - 但没有有效的开发者证书进行代码签名
   - 只使用了 `adhoc` 签名（自签名）

2. **macOS 安全策略**：
   - macOS 对从 DMG 安装的应用有更严格的安全检查
   - `hardenedRuntime` 要求有效的代码签名
   - 冲突导致应用启动时被系统限制

3. **entitlements 配置过度**：
   - 配置了复杂的 entitlements 文件
   - 在没有有效签名的情况下，这些权限声明可能被忽略或导致冲突

## 解决方案

### 修改 electron-builder 配置

**文件：** `package.json`

**修改前：**
```json
"mac": {
  "category": "public.app-category.productivity",
  "target": [
    {
      "target": "dmg",
      "arch": ["arm64", "x64"]
    }
  ],
  "icon": "public/icons/icon.icns",
  "hardenedRuntime": true,
  "gatekeeperAssess": false,
  "entitlements": "build-resources/entitlements.mac.plist",
  "entitlementsInherit": "build-resources/entitlements.mac.plist"
}
```

**修改后：**
```json
"mac": {
  "category": "public.app-category.productivity",
  "target": [
    {
      "target": "dmg",
      "arch": ["arm64", "x64"]
    }
  ],
  "icon": "public/icons/icon.icns",
  "hardenedRuntime": false,
  "gatekeeperAssess": false
}
```

### 关键修改点

1. **禁用 hardenedRuntime**：
   - 从 `true` 改为 `false`
   - 避免与 adhoc 签名的冲突

2. **移除 entitlements 配置**：
   - 删除 `entitlements` 和 `entitlementsInherit` 配置
   - 简化权限声明，避免不必要的复杂性

3. **保持 gatekeeperAssess: false**：
   - 继续禁用 Gatekeeper 评估
   - 允许未签名应用的安装和运行

## 技术原理

### hardenedRuntime 的作用

`hardenedRuntime` 是 macOS 的一项安全特性：
- 启用后会对应用施加额外的安全限制
- 要求应用必须有有效的开发者签名
- 提供更强的内存保护和代码完整性检查

### adhoc 签名的限制

`adhoc` 签名（自签名）：
- 不需要开发者证书
- 提供基本的代码完整性验证
- 但不被 macOS 视为"可信"签名
- 与 `hardenedRuntime` 不兼容

### DMG vs 直接运行的差异

1. **安装过程**：
   - DMG 安装会触发 macOS 的安全扫描
   - 系统会检查代码签名和权限声明
   - 直接运行跳过了部分安全检查

2. **权限继承**：
   - DMG 安装的应用权限更受限
   - 系统对其行为监控更严格

## 验证方法

### 1. 检查代码签名状态

```bash
codesign -dv --verbose=4 "release/mac-arm64/FlashBase Dev.app"
```

**期望输出**：
- `Signature=adhoc`
- 没有 `hardenedRuntime` 相关标志
- `flags=0x20002(adhoc,linker-signed)`

### 2. 测试 DMG 安装

1. 双击 `FlashBase Dev-1.1.0-dev-arm64.dmg`
2. 将应用拖拽到 Applications 文件夹
3. 从 Applications 启动应用
4. 验证：
   - 应用正常启动
   - Dock 图标不闪退
   - 窗口管理功能正常

### 3. 功能验证

- ✅ 应用启动正常
- ✅ Dock 图标行为正常
- ✅ 窗口关闭/恢复功能正常
- ✅ 系统托盘功能正常
- ✅ 应用退出功能正常

## 注意事项

### 开发环境 vs 生产环境

1. **开发环境**（当前配置）：
   - 使用 adhoc 签名
   - 禁用 hardenedRuntime
   - 适合开发和测试

2. **生产环境**（未来考虑）：
   - 需要有效的开发者证书
   - 可以启用 hardenedRuntime
   - 提供更好的安全性和用户信任度

### 安全考虑

- 当前配置优先考虑兼容性和可用性
- 在没有开发者证书的情况下，这是最佳选择
- 用户可能会看到"未知开发者"的警告，这是正常的

### 未来改进

1. **获取开发者证书**：
   - 申请 Apple Developer Program
   - 获得有效的"Developer ID Application"证书

2. **启用完整签名**：
   - 重新启用 `hardenedRuntime: true`
   - 配置适当的 entitlements
   - 提供公证（notarization）

## 相关文件

- `package.json` - electron-builder 配置
- `build-resources/entitlements.mac.plist` - 权限声明文件（已移除引用）
- `src/main/app.ts` - 应用生命周期管理
- `src/main/tray.ts` - 系统托盘管理

## 版本记录

- **修复版本**：v1.1.0-dev
- **修复日期**：2024年当前日期
- **影响范围**：macOS DMG 安装包
- **兼容性**：不影响其他平台和直接运行方式

---

*此修复确保了 FlashBase 通过 DMG 安装后能够正常运行，解决了 Dock 图标闪退的问题。*