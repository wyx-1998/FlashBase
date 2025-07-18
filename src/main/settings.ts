import Store from 'electron-store';
import { AppSettings } from '../shared/types';
import { DEFAULT_SETTINGS } from '../shared/constants';

export class SettingsManager {
  private store: Store<AppSettings>;

  constructor() {
    this.store = new Store<AppSettings>({
      name: 'flashbase-settings',
      defaults: DEFAULT_SETTINGS,
      // 加密存储敏感信息
      encryptionKey: 'flashbase-desktop-key',
      fileExtension: 'json'
    });
  }

  /**
   * 获取所有设置
   */
  getSettings(): AppSettings {
    return this.store.store;
  }

  /**
   * 保存设置
   */
  saveSettings(settings: AppSettings): void {
    this.store.store = settings;
  }

  /**
   * 获取特定设置项
   */
  getSetting<K extends keyof AppSettings>(key: K): AppSettings[K] {
    return this.store.get(key);
  }

  /**
   * 设置特定设置项
   */
  setSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
    this.store.set(key, value);
  }

  /**
   * 重置为默认设置
   */
  resetToDefaults(): void {
    this.store.clear();
    this.store.store = DEFAULT_SETTINGS;
  }

  /**
   * 导出设置
   */
  exportSettings(): string {
    return JSON.stringify(this.getSettings(), null, 2);
  }

  /**
   * 导入设置
   */
  importSettings(settingsJson: string): boolean {
    try {
      const settings = JSON.parse(settingsJson) as AppSettings;
      
      // 验证设置结构
      if (this.validateSettings(settings)) {
        this.saveSettings(settings);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('导入设置失败:', error);
      return false;
    }
  }

  /**
   * 验证设置结构
   */
  private validateSettings(settings: any): settings is AppSettings {
    return (
      settings &&
      typeof settings === 'object' &&
      settings.fastgpt &&
      settings.shortcuts &&
      settings.general &&
      settings.advanced
    );
  }

  /**
   * 获取设置文件路径
   */
  getSettingsPath(): string {
    return this.store.path;
  }

  /**
   * 检查设置是否存在
   */
  hasSettings(): boolean {
    return this.store.size > 0;
  }

  /**
   * 删除特定设置项
   */
  deleteSetting(key: keyof AppSettings): void {
    this.store.delete(key);
  }

  /**
   * 监听设置变化
   */
  onSettingsChanged(callback: (newSettings: AppSettings, oldSettings?: AppSettings) => void): void {
    this.store.onDidAnyChange((newValue, oldValue) => {
      if (newValue) {
        callback(newValue, oldValue);
      }
    });
  }

  /**
   * 获取配置版本
   */
  getConfigVersion(): string {
    return this.store.get('version', '1.0.0') as string;
  }

  /**
   * 迁移配置（用于版本升级）
   */
  migrateConfig(): void {
    const currentVersion = this.getConfigVersion();
    
    // 这里可以添加版本迁移逻辑
    if (currentVersion === '1.0.0') {
      // 迁移到新版本
      console.log('配置已是最新版本');
    }
  }
}