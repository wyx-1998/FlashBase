import { Tray, Menu, nativeImage, app } from 'electron';
import * as path from 'path';
import { WindowManager } from './window';
import { APP_INFO } from '../shared/constants';

export class TrayManager {
  private tray: Tray | null = null;
  private windowManager: WindowManager | null = null;

  async initialize(): Promise<void> {
    try {
      // 创建托盘图标
      const iconPath = this.getIconPath();
      const icon = nativeImage.createFromPath(iconPath);
      
      this.tray = new Tray(icon);
      this.tray.setToolTip(APP_INFO.name);
      
      // 设置托盘菜单
      this.updateContextMenu();
      
      // 托盘点击事件
      this.tray.on('click', () => {
        this.windowManager?.showMainWindow();
      });

      console.log('系统托盘初始化成功');
    } catch (error) {
      console.error('系统托盘初始化失败:', error);
    }
  }

  setWindowManager(windowManager: WindowManager): void {
    this.windowManager = windowManager;
  }

  private getIconPath(): string {
    // 使用简化的托盘图标，适合小尺寸显示
    return path.join(__dirname, '../../assets/icons/tray-icon.svg');
  }

  private updateContextMenu(): void {
    if (!this.tray) return;

    const contextMenu = Menu.buildFromTemplate([
      {
        label: '🔵 ' + APP_INFO.name,
        enabled: false
      },
      { type: 'separator' },
      // 智能导入和快速导入功能已移除
      // {
      //   label: '📚 快速导入到默认知识库',
      //   click: () => {
      //     this.handleQuickImport();
      //   }
      // },
      // {
      //   label: '🎯 智能导入选择...',
      //   click: () => {
      //     this.handleSmartImport();
      //   }
      // },
      // 截图功能已移除
      // {
      //   label: '📸 截图并导入',
      //   click: () => {
      //     this.handleScreenCapture();
      //   }
      // },
      {
        label: '📋 剪贴板导入',
        click: () => {
          this.handleClipboardImport();
        }
      },
      { type: 'separator' },
      {
        label: '⚙️ 设置',
        click: () => {
          this.windowManager?.showSettingsWindow();
        }
      },
      {
        label: '📊 导入历史',
        click: () => {
          this.windowManager?.showHistoryWindow();
        }
      },
      {
        label: '🔄 同步状态',
        click: () => {
          this.handleSyncStatus();
        }
      },
      { type: 'separator' },
      {
        label: '📖 帮助文档',
        click: () => {
          this.handleOpenHelp();
        }
      },
      {
        label: '❌ 退出',
        click: () => {
          app.quit();
        }
      }
    ]);

    this.tray.setContextMenu(contextMenu);
  }

  // 智能导入和快速导入功能已移除
  // private handleQuickImport(): void {
  //   // 触发快速导入
  //   console.log('托盘触发：快速导入');
  //   // 这里可以发送事件到主应用处理
  // }

  // private handleSmartImport(): void {
  //   // 显示智能导入界面
  //   console.log('托盘触发：智能导入');
  //   this.windowManager?.showSmartImportDialog();
  // }

  // 截图功能已移除
  // private handleScreenCapture(): void {
  //   // 截图功能已移除
  // }

  private handleClipboardImport(): void {
    // 触发剪贴板导入
    console.log('托盘触发：剪贴板导入');
    // 这里可以发送事件到主应用处理
  }

  private handleSyncStatus(): void {
    // 检查同步状态
    console.log('托盘触发：检查同步状态');
    this.windowManager?.showNotification('同步状态', '正在检查 FastGPT 连接状态...');
  }

  private handleOpenHelp(): void {
    // 打开帮助文档
    const { shell } = require('electron');
    shell.openExternal('https://github.com/dia-team/flashbase-desktop#readme');
  }

  /**
   * 更新托盘图标状态
   */
  updateStatus(status: 'idle' | 'working' | 'error'): void {
    if (!this.tray) return;

    const statusIcons = {
      idle: '🟢',
      working: '🟡',
      error: '🔴'
    };

    const statusTexts = {
      idle: '就绪',
      working: '工作中',
      error: '错误'
    };

    this.tray.setToolTip(`${APP_INFO.name} - ${statusTexts[status]}`);
    
    // 可以根据状态更换图标
    // const iconPath = this.getStatusIconPath(status);
    // const icon = nativeImage.createFromPath(iconPath);
    // this.tray.setImage(icon);
  }

  /**
   * 显示托盘通知
   */
  showNotification(title: string, body: string): void {
    if (!this.tray) return;

    this.tray.displayBalloon({
      title,
      content: body,
      iconType: 'info'
    });
  }

  /**
   * 销毁托盘
   */
  destroy(): void {
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
      console.log('系统托盘已销毁');
    }
  }

  /**
   * 检查托盘是否已初始化
   */
  isInitialized(): boolean {
    return this.tray !== null;
  }
}