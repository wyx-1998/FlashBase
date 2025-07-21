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
      // 修复打包后的路径问题
      let rendererPath: string;
      const fs = require('fs');
      
      // 检查是否在打包环境中
      if (process.resourcesPath) {
        // 打包后，renderer 文件在 extraResources 中，位于 app/Contents/Resources/renderer/
        rendererPath = path.join(process.resourcesPath, 'renderer/index.html');
      } else {
        // 开发环境或未打包的情况
        rendererPath = path.join(__dirname, '../../dist/renderer/index.html');
      }
      
      console.log('Loading renderer from:', rendererPath);
      console.log('Process resources path:', process.resourcesPath);
      console.log('__dirname:', __dirname);
      
      // 检查文件是否存在
      if (fs.existsSync(rendererPath)) {
        this.mainWindow.loadFile(rendererPath);
        console.log('Successfully loaded renderer from:', rendererPath);
      } else {
        console.error('Renderer file not found at:', rendererPath);
        
        // 尝试多个备用路径
        const fallbackPaths = [
          path.join(__dirname, '../../renderer/index.html'),
          path.join(__dirname, '../renderer/index.html'),
          path.join(process.cwd(), 'dist/renderer/index.html'),
          path.join(process.cwd(), 'renderer/index.html')
        ];
        
        let loaded = false;
        for (const fallbackPath of fallbackPaths) {
          console.log('Trying fallback path:', fallbackPath);
          if (fs.existsSync(fallbackPath)) {
            this.mainWindow.loadFile(fallbackPath);
            console.log('Successfully loaded from fallback:', fallbackPath);
            loaded = true;
            break;
          }
        }
        
        if (!loaded) {
          console.error('All renderer paths failed');
          // 显示错误页面
          this.mainWindow.loadURL(`data:text/html,<h1>Error: Renderer not found</h1><p>Attempted path: ${rendererPath}</p><p>Process resources: ${process.resourcesPath}</p><p>__dirname: ${__dirname}</p>`);
        }
      }
    }

    // 窗口事件处理
    this.mainWindow.on('ready-to-show', () => {
      console.log('Main window ready to show');
      this.mainWindow?.show();
    });

    // 添加加载失败处理
    this.mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      console.error('Failed to load main window:', errorCode, errorDescription, validatedURL);
      // 如果加载失败，仍然显示窗口以便调试
      this.mainWindow?.show();
    });

    // 添加加载完成处理
    this.mainWindow.webContents.on('did-finish-load', () => {
      console.log('Main window finished loading');
      // 确保窗口显示
      if (!this.mainWindow?.isVisible()) {
        this.mainWindow?.show();
      }
    });

    // 添加超时显示机制
    setTimeout(() => {
      if (this.mainWindow && !this.mainWindow.isDestroyed() && !this.mainWindow.isVisible()) {
        console.log('Force showing main window after timeout');
        this.mainWindow.show();
      }
    }, 3000);

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    // 处理窗口关闭事件
    this.mainWindow.on('close', (event) => {
      const { app } = require('electron');
      console.log('Main window close event, isQuitting:', (app as any).isQuitting);
      
      // 检查是否正在退出应用
      if (!(app as any).isQuitting) {
        event.preventDefault();
        this.mainWindow?.hide();
        console.log('Main window hidden, app continues running in tray');
        
        // 在 macOS 上，确保应用不会意外退出
        if (process.platform === 'darwin') {
          // 防止应用在所有窗口关闭时退出
          app.dock?.hide();
        }
      } else {
        console.log('App is quitting, allowing window to close');
        // 确保所有资源被正确清理
        this.mainWindow?.webContents?.removeAllListeners();
      }
    });

    return this.mainWindow;
  }

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
      this.settingsWindow.loadFile(path.join(process.resourcesPath, 'renderer/index.html'));
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
      this.historyWindow.loadFile(path.join(process.resourcesPath, 'renderer/index.html'));
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
      this.quickPanel.loadFile(path.join(process.resourcesPath, 'renderer/index.html'));
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