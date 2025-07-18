import { BrowserWindow, Notification, screen } from 'electron';
import * as path from 'path';
import { WINDOW_CONFIG } from '../shared/constants';

export class WindowManager {
  private mainWindow: BrowserWindow | null = null;
  private settingsWindow: BrowserWindow | null = null;
  private historyWindow: BrowserWindow | null = null;
  private quickPanel: BrowserWindow | null = null;

  async initialize(): Promise<void> {
    // 初始化时不创建主窗口，只在需要时创建
    console.log('窗口管理器初始化成功');
  }

  /**
   * 创建主窗口
   */
  createMainWindow(): BrowserWindow {
    if (this.mainWindow) {
      return this.mainWindow;
    }

    this.mainWindow = new BrowserWindow({
      width: WINDOW_CONFIG.main.width,
      height: WINDOW_CONFIG.main.height,
      minWidth: WINDOW_CONFIG.main.minWidth,
      minHeight: WINDOW_CONFIG.main.minHeight,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, '../../preload/index.js')
      },
      icon: this.getAppIcon()
    });

    // 加载渲染进程
    if (process.env.NODE_ENV === 'development') {
      this.mainWindow.loadURL('http://localhost:5173');
      this.mainWindow.webContents.openDevTools();
    } else {
      this.mainWindow.loadFile(path.join(__dirname, '../../dist/renderer/index.html'));
    }

    // 窗口事件处理
    this.mainWindow.on('ready-to-show', () => {
      this.mainWindow?.show();
    });

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    // 阻止默认的关闭行为，改为隐藏到托盘
    this.mainWindow.on('close', (event) => {
      event.preventDefault();
      this.mainWindow?.hide();
    });

    return this.mainWindow;
  }

  /**
   * 显示主窗口
   */
  showMainWindow(): void {
    if (!this.mainWindow) {
      this.createMainWindow();
    }
    
    this.mainWindow?.show();
    this.mainWindow?.focus();
  }

  /**
   * 创建设置窗口
   */
  createSettingsWindow(): BrowserWindow {
    if (this.settingsWindow) {
      return this.settingsWindow;
    }

    this.settingsWindow = new BrowserWindow({
      width: WINDOW_CONFIG.settings.width,
      height: WINDOW_CONFIG.settings.height,
      resizable: WINDOW_CONFIG.settings.resizable,
      parent: this.mainWindow || undefined,
      modal: true,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, '../../preload/index.js')
      }
    });

    // 加载设置页面
    if (process.env.NODE_ENV === 'development') {
      this.settingsWindow.loadURL('http://localhost:5173');
    } else {
      this.settingsWindow.loadFile(path.join(__dirname, '../../dist/renderer/index.html'));
    }

    this.settingsWindow.on('ready-to-show', () => {
      this.settingsWindow?.show();
    });

    this.settingsWindow.on('closed', () => {
      this.settingsWindow = null;
    });

    return this.settingsWindow;
  }

  /**
   * 显示设置窗口
   */
  showSettingsWindow(): void {
    if (!this.settingsWindow) {
      this.createSettingsWindow();
    }
    
    this.settingsWindow?.show();
    this.settingsWindow?.focus();
  }

  /**
   * 创建历史记录窗口
   */
  createHistoryWindow(): BrowserWindow {
    if (this.historyWindow) {
      return this.historyWindow;
    }

    this.historyWindow = new BrowserWindow({
      width: 600,
      height: 500,
      parent: this.mainWindow || undefined,
      modal: false,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, '../../preload/index.js')
      }
    });

    // 加载历史记录页面
    if (process.env.NODE_ENV === 'development') {
      this.historyWindow.loadURL('http://localhost:5173');
    } else {
      this.historyWindow.loadFile(path.join(__dirname, '../../dist/renderer/index.html'));
    }

    this.historyWindow.on('ready-to-show', () => {
      this.historyWindow?.show();
    });

    this.historyWindow.on('closed', () => {
      this.historyWindow = null;
    });

    return this.historyWindow;
  }

  /**
   * 显示历史记录窗口
   */
  showHistoryWindow(): void {
    if (!this.historyWindow) {
      this.createHistoryWindow();
    }
    
    this.historyWindow?.show();
    this.historyWindow?.focus();
  }

  /**
   * 创建快捷操作面板
   */
  createQuickPanel(): BrowserWindow {
    if (this.quickPanel) {
      return this.quickPanel;
    }

    // 获取屏幕中心位置
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;
    const windowWidth = WINDOW_CONFIG.panel.width;
    const windowHeight = WINDOW_CONFIG.panel.height;

    this.quickPanel = new BrowserWindow({
      width: windowWidth,
      height: windowHeight,
      x: Math.round((width - windowWidth) / 2),
      y: Math.round((height - windowHeight) / 2),
      alwaysOnTop: WINDOW_CONFIG.panel.alwaysOnTop,
      frame: WINDOW_CONFIG.panel.frame,
      transparent: WINDOW_CONFIG.panel.transparent,
      resizable: false,
      movable: true,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, '../../preload/index.js')
      }
    });

    // 加载快捷面板页面
    if (process.env.NODE_ENV === 'development') {
      this.quickPanel.loadURL('http://localhost:5173');
    } else {
      this.quickPanel.loadFile(path.join(__dirname, '../../dist/renderer/index.html'));
    }

    this.quickPanel.on('ready-to-show', () => {
      this.quickPanel?.show();
    });

    this.quickPanel.on('blur', () => {
      // 失去焦点时隐藏面板
      this.quickPanel?.hide();
    });

    this.quickPanel.on('closed', () => {
      this.quickPanel = null;
    });

    return this.quickPanel;
  }

  /**
   * 显示快捷操作面板
   */
  showQuickPanel(): void {
    if (!this.quickPanel) {
      this.createQuickPanel();
    }
    
    this.quickPanel?.show();
    this.quickPanel?.focus();
  }

  /**
   * 隐藏快捷操作面板
   */
  hideQuickPanel(): void {
    this.quickPanel?.hide();
  }

  // 智能导入对话框功能已移除
  // /**
  //  * 显示智能导入对话框
  //  */
  // showSmartImportDialog(): void {
  //   // 创建智能导入对话框
  //   const dialog = new BrowserWindow({
  //     width: 500,
  //     height: 400,
  //     parent: this.mainWindow || undefined,
  //     modal: true,
  //     show: false,
  //     webPreferences: {
  //       nodeIntegration: false,
  //       contextIsolation: true,
  //       preload: path.join(__dirname, '../../preload/index.js')
  //     }
  //   });

  //   // 加载智能导入页面
  //   if (process.env.NODE_ENV === 'development') {
  //     dialog.loadURL('http://localhost:5173');
  //   } else {
  //     dialog.loadFile(path.join(__dirname, '../../dist/renderer/index.html'));
  //   }

  //   dialog.on('ready-to-show', () => {
  //     dialog.show();
  //   });
  // }

  /**
   * 显示系统通知
   */
  showNotification(title: string, body: string): void {
    try {
      if (Notification.isSupported()) {
        const notification = new Notification({
          title,
          body,
          icon: this.getAppIcon()
        });
        
        notification.show();
        console.log(`显示通知: ${title} - ${body}`);
      } else {
        console.warn('系统不支持通知');
      }
    } catch (error) {
      console.error('显示通知失败:', error);
    }
  }

  /**
   * 获取应用图标路径
   */
  private getAppIcon(): string {
    // 使用 SVG 图标，所有平台通用
    return path.join(__dirname, '../../assets/icons/icon.svg');
  }

  /**
   * 关闭所有窗口
   */
  closeAllWindows(): void {
    this.quickPanel?.close();
    this.historyWindow?.close();
    this.settingsWindow?.close();
    this.mainWindow?.close();
  }

  /**
   * 获取主窗口
   */
  getMainWindow(): BrowserWindow | null {
    return this.mainWindow;
  }

  /**
   * 检查主窗口是否存在
   */
  hasMainWindow(): boolean {
    return this.mainWindow !== null && !this.mainWindow.isDestroyed();
  }
}