import { globalShortcut } from 'electron';
import { ShortcutConfig } from '../shared/types';

export class GlobalShortcutManager {
  private shortcuts: Map<string, () => void> = new Map();

  /**
   * 注册单个快捷键
   */
  register(accelerator: string, callback: () => void): boolean {
    try {
      // 如果快捷键已注册，先取消注册
      if (this.shortcuts.has(accelerator)) {
        globalShortcut.unregister(accelerator);
      }

      const success = globalShortcut.register(accelerator, callback);
      if (success) {
        this.shortcuts.set(accelerator, callback);
        console.log(`快捷键 ${accelerator} 注册成功`);
      } else {
        console.warn(`快捷键 ${accelerator} 注册失败，可能已被其他应用占用`);
      }
      return success;
    } catch (error) {
      console.error(`注册快捷键 ${accelerator} 时发生错误:`, error);
      return false;
    }
  }

  /**
   * 从配置批量注册快捷键
   */
  registerFromConfig(config: ShortcutConfig): { [key: string]: boolean } {
    const results: { [key: string]: boolean } = {};
    
    Object.entries(config).forEach(([action, accelerator]) => {
      results[action] = this.register(accelerator, () => {
        console.log(`快捷键动作触发: ${action} (${accelerator})`);
      });
    });

    return results;
  }

  /**
   * 取消注册单个快捷键
   */
  unregister(accelerator: string): void {
    try {
      if (this.shortcuts.has(accelerator)) {
        globalShortcut.unregister(accelerator);
        this.shortcuts.delete(accelerator);
        console.log(`快捷键 ${accelerator} 已取消注册`);
      }
    } catch (error) {
      console.error(`取消注册快捷键 ${accelerator} 时发生错误:`, error);
    }
  }

  /**
   * 取消注册所有快捷键
   */
  unregisterAll(): void {
    try {
      globalShortcut.unregisterAll();
      this.shortcuts.clear();
      // 在应用关闭时避免控制台输出，防止EPIPE错误
      if (process.stdout && !process.stdout.destroyed) {
        console.log('所有快捷键已取消注册');
      }
    } catch (error) {
      // 在应用关闭时避免控制台输出，防止EPIPE错误
      if (process.stderr && !process.stderr.destroyed) {
        console.error('取消注册所有快捷键时发生错误:', error);
      }
    }
  }

  /**
   * 检查快捷键是否已注册
   */
  isRegistered(accelerator: string): boolean {
    return globalShortcut.isRegistered(accelerator);
  }

  /**
   * 获取已注册的快捷键列表
   */
  getRegisteredShortcuts(): string[] {
    return Array.from(this.shortcuts.keys());
  }

  /**
   * 重新注册所有快捷键
   */
  reregisterAll(): void {
    const currentShortcuts = Array.from(this.shortcuts.entries());
    this.unregisterAll();
    
    currentShortcuts.forEach(([accelerator, callback]) => {
      this.register(accelerator, callback);
    });
  }

  /**
   * 检查快捷键是否可用
   */
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
} 