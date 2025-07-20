import { app, BrowserWindow, ipcMain, shell } from 'electron';
import * as path from 'path';
import { GlobalShortcutManager } from './shortcut';
import { TrayManager } from './tray';
import { WindowManager } from './window';
import { ContentExtractor } from './content';
import { FastGPTClient } from './api/fastgpt';
import { SettingsManager } from './settings';
import { HistoryManager } from './history';
import { IPCChannel, ShortcutAction } from '../shared/types';
import { APP_INFO } from '../shared/constants';

class DiaFastGPTApp {
  private shortcutManager: GlobalShortcutManager;
  private trayManager: TrayManager;
  private windowManager: WindowManager;
  private contentExtractor: ContentExtractor;
  private fastgptClient: FastGPTClient;
  private settingsManager: SettingsManager;
  private historyManager: HistoryManager;

  constructor() {
    this.shortcutManager = new GlobalShortcutManager();
    this.trayManager = new TrayManager();
    this.windowManager = new WindowManager();
    this.contentExtractor = new ContentExtractor();
    this.settingsManager = new SettingsManager();
    this.historyManager = new HistoryManager();
    
    // 初始化 FastGPT 客户端
    const settings = this.settingsManager.getSettings();
    this.fastgptClient = new FastGPTClient(settings.fastgpt);
    
    this.initializeApp();
  }

  private initializeApp(): void {
    // 设置应用信息
    app.setName(APP_INFO.name);
    
    // 确保单实例运行
    const gotTheLock = app.requestSingleInstanceLock();
    if (!gotTheLock) {
      app.quit();
      return;
    }

    // 应用事件监听
    app.whenReady().then(() => {
      this.onAppReady();
    });

    app.on('second-instance', () => {
      this.windowManager.showMainWindow();
    });

    app.on('window-all-closed', () => {
      // 在 macOS 上，即使关闭所有窗口，应用也应该继续运行
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    app.on('activate', () => {
      this.windowManager.showMainWindow();
    });

    app.on('before-quit', () => {
      this.onAppQuit();
    });

    // 注册 IPC 处理器
    this.registerIPCHandlers();
  }

  private async onAppReady(): Promise<void> {
    try {
      // 初始化系统托盘
      await this.trayManager.initialize();
      
      // 初始化窗口管理器
      await this.windowManager.initialize();
      
      // 显示主窗口
      this.windowManager.showMainWindow();
      
      // 注册全局快捷键
      await this.registerGlobalShortcuts();
      
      // 初始化历史记录管理器
      await this.historyManager.initialize();
      
      console.log(`${APP_INFO.name} v${APP_INFO.version} 启动成功`);
    } catch (error) {
      console.error('应用初始化失败:', error);
    }
  }

  private onAppQuit(): void {
    try {
      // 清理资源
      this.shortcutManager.unregisterAll();
      this.trayManager.destroy();
      this.historyManager.cleanup();
    } catch (error) {
      // 在应用关闭时避免控制台输出，防止EPIPE错误
      if (process.stderr && !process.stderr.destroyed) {
        console.error('应用退出清理时发生错误:', error);
      }
    }
  }

  /**
   * 显示知识库选择对话框
   */
  private async showKnowledgeBaseSelection(knowledgeBases: any[]): Promise<any | null> {
    const { dialog } = require('electron');
    
    const choices = knowledgeBases.map((kb, index) => `${index}: ${kb.name}`);
    
    const result = await dialog.showMessageBox(this.windowManager.getMainWindow()!, {
      type: 'question',
      title: '选择知识库',
      message: '请选择要导入到哪个知识库:',
      detail: choices.join('\n'),
      buttons: [...knowledgeBases.map(kb => kb.name), '取消'],
      // 移除 defaultId，不自动选择任何知识库，强制用户手动选择
      cancelId: knowledgeBases.length,
      alwaysOnTop: true  // 添加置顶属性
    });
    
    if (result.response === knowledgeBases.length) {
      return null; // 用户取消
    }
    
    return knowledgeBases[result.response];
  }

  private async registerGlobalShortcuts(): Promise<void> {
    const settings = this.settingsManager.getSettings();
    let shortcuts = settings.shortcuts;

    // 确保所有快捷键都有默认值
    if (!shortcuts.fileImport) {
      console.log('fileImport快捷键缺失，使用默认值');
      shortcuts = {
        ...shortcuts,
        fileImport: 'CommandOrControl+Shift+F'
      };
      // 保存更新后的设置
      this.settingsManager.saveSettings({
        ...settings,
        shortcuts
      });
    }



    // 注册快捷键处理器
    // 智能导入和快速导入功能已移除
    // this.shortcutManager.register(shortcuts.smartImport, () => {
    //   this.handleShortcutAction(ShortcutAction.SMART_IMPORT);
    // });

    // this.shortcutManager.register(shortcuts.quickImport, () => {
    //   this.handleShortcutAction(ShortcutAction.QUICK_IMPORT);
    // });

    // 截图功能已移除
    // this.shortcutManager.register(shortcuts.screenCapture, () => {
    //   this.handleShortcutAction(ShortcutAction.SCREEN_CAPTURE);
    // });

    this.shortcutManager.register(shortcuts.clipboardImport, () => {
      this.handleShortcutAction(ShortcutAction.CLIPBOARD_IMPORT);
    });

    // 检查fileImport快捷键是否存在
    if (shortcuts.fileImport) {
      this.shortcutManager.register(shortcuts.fileImport, () => {
        this.handleShortcutAction(ShortcutAction.FILE_IMPORT);
      });
    } else {
      console.warn('fileImport快捷键未定义，跳过注册');
    }

    this.shortcutManager.register(shortcuts.showPanel, () => {
      this.handleShortcutAction(ShortcutAction.SHOW_PANEL);
    });
  }

  private async handleShortcutAction(action: ShortcutAction): Promise<void> {
    try {
      switch (action) {
        // case ShortcutAction.SMART_IMPORT:     // 智能导入功能已移除
        //   await this.handleSmartImport();
        //   break;
        // case ShortcutAction.QUICK_IMPORT:     // 快速导入功能已移除
        //   await this.handleQuickImport();
        //   break;
        // case ShortcutAction.SCREEN_CAPTURE:  // 截图功能已移除
        //   await this.handleScreenCapture();
        //   break;
        case ShortcutAction.CLIPBOARD_IMPORT:
          await this.handleClipboardImport();
          break;
        case ShortcutAction.FILE_IMPORT:
          await this.handleFileImport();
          break;
        case ShortcutAction.SHOW_PANEL:
          this.windowManager.showQuickPanel();
          break;
      }
    } catch (error) {
      console.error(`处理快捷键动作 ${action} 失败:`, error);
    }
  }

  // 智能导入和快速导入功能已移除
  // private async handleSmartImport(): Promise<void> {
  //   // 智能导入：先获取选中文本，如果没有则获取剪贴板内容
  //   const selectedText = await this.contentExtractor.getSelectedText();
  //   if (selectedText) {
  //     await this.importContent(selectedText, 'selection');
  //   } else {
  //     const clipboardContent = await this.contentExtractor.getClipboardContent();
  //     if (clipboardContent.text) {
  //       await this.importContent(clipboardContent.text, 'clipboard');
  //     }
  //   }
  // }

  // private async handleQuickImport(): Promise<void> {
  //   // 快速导入：直接导入剪贴板内容
  //   const clipboardContent = await this.contentExtractor.getClipboardContent();
  //   if (clipboardContent.text) {
  //     await this.importContent(clipboardContent.text, 'clipboard');
  //   }
  // }

  // 截图功能已完全移除
  // private async handleScreenCapture(): Promise<void> {
  //   // 截图功能已移除
  // }

  private async handleClipboardImport(): Promise<void> {
    // 剪贴板导入：直接导入剪贴板内容
    const clipboardContent = await this.contentExtractor.getClipboardContent();
    if (clipboardContent.text) {
      const result = await this.importContent(clipboardContent.text, 'clipboard');
      // 快捷键导入的结果已经在importContent内部处理了通知，这里不需要额外处理
      console.log('快捷键导入结果:', result);
    }
  }

  private async handleFileImport(): Promise<void> {
    try {
      const { dialog } = require('electron');
      const result = await dialog.showOpenDialog(this.windowManager.getMainWindow()!, {
        title: '选择要导入的文件',
        properties: ['openFile', 'multiSelections'],
        filters: [
          { name: '文档文件', extensions: ['txt', 'md', 'doc', 'docx', 'pdf'] },
          { name: '图片文件', extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'] },
          { name: '代码文件', extensions: ['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'css', 'html'] },
          { name: '所有文件', extensions: ['*'] }
        ]
      });

      if (!result.canceled && result.filePaths.length > 0) {
        for (const filePath of result.filePaths) {
          await this.importFileContent(filePath);
        }
      }
    } catch (error) {
      console.error('文件导入失败:', error);
      const settings = this.settingsManager.getSettings();
      if (settings.general.enableNotifications) {
        this.windowManager.showNotification(
          '文件导入失败',
          error instanceof Error ? error.message : '未知错误'
        );
      }
    }
  }

  private async importFileContent(filePath: string): Promise<void> {
    try {
      const fs = require('fs');
      const path = require('path');
      
      const fileName = path.basename(filePath);
      const fileExtension = path.extname(filePath).toLowerCase();
      const stats = fs.statSync(filePath);
      
      // 读取文件内容
      let content = '';
      if (['.txt', '.md', '.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cpp', '.c', '.css', '.html'].includes(fileExtension)) {
        content = fs.readFileSync(filePath, 'utf8');
      } else {
        // 对于其他文件类型，暂时只记录文件信息
        content = `文件名: ${fileName}\n文件大小: ${stats.size} 字节\n文件路径: ${filePath}`;
      }
      
      // 导入内容
      const result = await this.importContent(content, 'file');
      console.log(`文件 ${fileName} 导入结果:`, result);
      
    } catch (error) {
      console.error(`导入文件 ${filePath} 失败:`, error);
      throw error;
    }
  }

  private async importContent(content: string, source: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      console.log(`开始导入内容: 来源=${source}, 长度=${content.length}`);
      
      // 根据来源确定内容类型
      const contentType = source === 'file' ? 'file' : 'text';
      
      // 获取有写权限的知识库
      const appSettings = this.settingsManager.getSettings();
      console.log('FastGPT配置:', {
        baseUrl: appSettings.fastgpt.baseUrl,
        hasApiKey: !!appSettings.fastgpt.apiKey,
        timeout: appSettings.fastgpt.timeout
      });
      
      // 获取所有知识库并筛选有权限的
      console.log('正在获取知识库列表...');
      const allKnowledgeBases = await this.fastgptClient.getKnowledgeBases();
      console.log(`获取到 ${allKnowledgeBases.length} 个知识库`);
      
      if (allKnowledgeBases.length === 0) {
        throw new Error('没有可用的知识库');
      }

      // 打印所有知识库信息
      allKnowledgeBases.forEach((kb, index) => {
        console.log(`知识库 ${index + 1}: ${kb.name} (ID: ${kb.id})`);
      });

      // 查找有写权限的知识库
      let writableKnowledgeBases = [];
      console.log('开始检查知识库权限...');
      
      for (const kb of allKnowledgeBases) {
        try {
          console.log(`检查知识库权限: ${kb.name} (ID: ${kb.id})`);
          const hasWritePermission = await this.fastgptClient.checkWritePermission(kb.id);
          console.log(`知识库 ${kb.name} 权限检查结果: ${hasWritePermission}`);
          
          if (hasWritePermission) {
            writableKnowledgeBases.push(kb);
            console.log(`✓ 知识库 ${kb.name} 有写权限`);
          } else {
            console.log(`✗ 知识库 ${kb.name} 无写权限`);
          }
        } catch (error) {
          console.warn(`检查知识库 ${kb.name} 权限失败:`, error);
          continue;
        }
      }

      console.log(`找到 ${writableKnowledgeBases.length} 个有写权限的知识库`);

      if (writableKnowledgeBases.length === 0) {
        throw new Error('没有找到具有写权限的知识库');
      }

      // 总是显示知识库选择对话框，让用户确认选择
      let targetKnowledgeBase = null;
      
      // 显示知识库选择对话框
      targetKnowledgeBase = await this.showKnowledgeBaseSelection(writableKnowledgeBases);
      if (!targetKnowledgeBase) {
        console.log('用户取消了知识库选择');
        throw new Error('用户取消了知识库选择');
      }
      console.log(`用户选择了知识库: ${targetKnowledgeBase.name}`);
      
      // 如果只有一个知识库，在对话框中会自动高亮显示
      if (writableKnowledgeBases.length === 1) {
        console.log(`确认选择唯一的可写知识库: ${targetKnowledgeBase.name}`);
      }

      console.log(`开始调用FastGPT API导入内容到知识库: ${targetKnowledgeBase.name} (ID: ${targetKnowledgeBase.id})`);
      console.log(`导入内容预览: ${content.substring(0, 100)}...`);
      
      const result = await this.fastgptClient.importContent({
        content,
        type: contentType as any,
        source,
        metadata: {
          source: source as any,
          type: contentType as any,
          timestamp: Date.now(),
          size: content.length
        },
        knowledgeBaseId: targetKnowledgeBase.id
      });

      console.log('导入结果:', result);

      // 保存到历史记录
      console.log('开始保存历史记录...');
      const historyItem = {
        id: Date.now().toString(),
        content,
        type: contentType as any,
        source: source as any,
        timestamp: Date.now(),
        metadata: {
          source: source as any,
          type: contentType as any,
          timestamp: Date.now(),
          size: content.length,
          knowledgeBaseName: targetKnowledgeBase.name
        },
        result
      };
      console.log('历史记录项:', historyItem);
      await this.historyManager.addItem(historyItem);
      console.log('历史记录保存成功');
      
      // 验证历史记录是否保存成功
      const savedHistory = this.historyManager.getHistory();
      console.log(`当前历史记录总数: ${savedHistory.length}`);
      if (savedHistory.length > 0) {
        console.log('最新历史记录:', savedHistory[0]);
      }

      // 显示通知 - 检查用户设置
      if (appSettings.general.enableNotifications) {
        this.windowManager.showNotification(
          result.success ? '导入成功' : '导入失败',
          result.success 
            ? `已导入到知识库: ${targetKnowledgeBase.name}` 
            : (result.message || result.error || '')
        );
      }
      
      // 返回导入结果
      return {
        success: result.success,
        message: result.success ? `已导入到知识库: ${targetKnowledgeBase.name}` : (result.message || result.error || '导入失败')
      };
    } catch (error: any) {
      console.error('导入内容失败:', error);
      
      // 根据来源确定内容类型
      const contentType = source === 'file' ? 'file' : 'text';
      
      // 保存失败记录到历史
      console.log('开始保存失败记录到历史...');
      const failedHistoryItem = {
        id: Date.now().toString(),
        content,
        type: contentType as any,
        source: source as any,
        timestamp: Date.now(),
        metadata: {
          source: source as any,
          type: contentType as any,
          timestamp: Date.now(),
          size: content.length
        },
        result: {
          success: false,
          error: error.message || '导入失败'
        }
      };
      console.log('失败历史记录项:', failedHistoryItem);
      await this.historyManager.addItem(failedHistoryItem);
      console.log('失败历史记录保存成功');
      
      // 验证历史记录是否保存成功
      const savedHistory = this.historyManager.getHistory();
      console.log(`当前历史记录总数: ${savedHistory.length}`);
      if (savedHistory.length > 0) {
        console.log('最新历史记录:', savedHistory[0]);
      }

      // 显示错误通知 - 检查用户设置
      const errorNotificationSettings = this.settingsManager.getSettings();
      if (errorNotificationSettings.general.enableNotifications) {
        this.windowManager.showNotification(
          '导入失败',
          error.message || '未知错误'
        );
      }
      
      // 返回错误结果
      return {
        success: false,
        error: error.message || '导入失败'
      };
    }
  }

  private getMimeType(extension: string): string {
    const mimeTypes: { [key: string]: string } = {
      '.txt': 'text/plain',
      '.md': 'text/markdown',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.bmp': 'image/bmp',
      '.webp': 'image/webp',
      '.js': 'text/javascript',
      '.ts': 'text/typescript',
      '.jsx': 'text/jsx',
      '.tsx': 'text/tsx',
      '.py': 'text/x-python',
      '.java': 'text/x-java-source',
      '.cpp': 'text/x-c++src',
      '.c': 'text/x-csrc',
      '.css': 'text/css',
      '.html': 'text/html'
    };
    
    return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
  }

  private registerIPCHandlers(): void {
    // 快捷键相关
    ipcMain.handle(IPCChannel.REGISTER_SHORTCUTS, async (event, shortcuts) => {
      return this.shortcutManager.registerFromConfig(shortcuts);
    });

    ipcMain.handle(IPCChannel.UNREGISTER_SHORTCUTS, async () => {
      this.shortcutManager.unregisterAll();
    });

    // 内容处理相关
    ipcMain.handle(IPCChannel.GET_CLIPBOARD_CONTENT, async () => {
      return this.contentExtractor.getClipboardContent();
    });

    // 文件处理相关
    ipcMain.handle(IPCChannel.SHOW_FILE_DIALOG, async () => {
      try {
        const { dialog } = require('electron');
        const result = await dialog.showOpenDialog(this.windowManager.getMainWindow()!, {
          title: '选择要导入的文件',
          properties: ['openFile', 'multiSelections'],
          filters: [
            { name: '文档文件', extensions: ['txt', 'md', 'doc', 'docx', 'pdf'] },
            { name: '图片文件', extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'] },
            { name: '代码文件', extensions: ['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'css', 'html'] },
            { name: '所有文件', extensions: ['*'] }
          ]
        });
        return result;
      } catch (error) {
        console.error('显示文件对话框失败:', error);
        return { canceled: true, filePaths: [] };
      }
    });

    ipcMain.handle(IPCChannel.VALIDATE_FILE, async (event, filePath) => {
      try {
        const fs = require('fs');
        const path = require('path');
        
        if (!fs.existsSync(filePath)) {
          return {
            valid: false,
            error: '文件不存在'
          };
        }
        
        const stats = fs.statSync(filePath);
        const fileExtension = path.extname(filePath).toLowerCase();
        const supportedExtensions = ['.txt', '.md', '.doc', '.docx', '.pdf', '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cpp', '.c', '.css', '.html'];
        
        if (!supportedExtensions.includes(fileExtension)) {
          return {
            valid: false,
            error: '不支持的文件格式',
            supportedFormats: supportedExtensions
          };
        }
        
        // 检查文件大小（限制为10MB）
        const maxSize = 10 * 1024 * 1024;
        if (stats.size > maxSize) {
          return {
            valid: false,
            error: '文件大小超过限制（最大10MB）'
          };
        }
        
        return { valid: true };
      } catch (error) {
        console.error('验证文件失败:', error);
        return {
          valid: false,
          error: error instanceof Error ? error.message : '文件验证失败'
        };
      }
    });

    ipcMain.handle(IPCChannel.IMPORT_FILE, async (event, fileData) => {
      try {
        const fs = require('fs');
        const path = require('path');
        
        const { filePath, knowledgeBaseId } = fileData;
        const fileName = path.basename(filePath);
        const fileExtension = path.extname(filePath).toLowerCase();
        const stats = fs.statSync(filePath);
        
        // 读取文件内容
        let content = '';
        if (['.txt', '.md', '.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cpp', '.c', '.css', '.html'].includes(fileExtension)) {
          content = fs.readFileSync(filePath, 'utf8');
        } else {
          // 对于其他文件类型，暂时只记录文件信息
          content = `文件名: ${fileName}\n文件大小: ${stats.size} 字节\n文件路径: ${filePath}`;
        }
        
        // 构建导入数据
        const importData = {
          content,
          type: 'file' as any,
          source: 'file',
          metadata: {
            source: 'file' as any,
            type: 'file' as any,
            timestamp: Date.now(),
            size: content.length,
            filename: fileName,
            mimeType: this.getMimeType(fileExtension),
            originalPath: filePath
          },
          knowledgeBaseId
        };
        
        // 导入内容
        if (knowledgeBaseId) {
          const result = await this.fastgptClient.importContent(importData);
          
          // 保存到历史记录
          const historyItem = {
            id: Date.now().toString(),
            content: importData.content,
            type: importData.type,
            source: importData.source as any,
            timestamp: Date.now(),
            metadata: importData.metadata,
            result
          };
          await this.historyManager.addItem(historyItem);
          
          return result;
        } else {
          return await this.importContent(content, 'file');
        }
      } catch (error) {
        console.error('IPC文件导入失败:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : '文件导入失败'
        };
      }
    });

    // 截图和OCR功能已移除
    // // 截图和OCR功能已完全移除
    // ipcMain.handle(IPCChannel.CAPTURE_SCREEN, async () => {
    //   return this.contentExtractor.captureScreen();
    // });

    // ipcMain.handle(IPCChannel.EXTRACT_TEXT_FROM_IMAGE, async (event, imageBuffer) => {
    //   return this.contentExtractor.extractTextFromImage(imageBuffer);
    // });

    // FastGPT 集成相关
    ipcMain.handle(IPCChannel.TEST_FASTGPT_CONNECTION, async () => {
      try {
        const success = await this.fastgptClient.testConnection();
        return {
          success,
          message: success ? '连接成功！FastGPT API 可以正常访问' : '连接失败，请检查 API 地址和密钥'
        };
      } catch (error: any) {
        console.error('测试连接时发生错误:', error);
        return {
          success: false,
          message: `连接失败: ${error.message || '未知错误'}`
        };
      }
    });

    ipcMain.handle(IPCChannel.GET_KNOWLEDGE_BASES, async () => {
      return this.fastgptClient.getKnowledgeBases();
    });

    ipcMain.handle(IPCChannel.IMPORT_CONTENT, async (event, data) => {
      try {
        // 如果提供了knowledgeBaseId，直接使用FastGPT客户端导入
        if (data.knowledgeBaseId) {
          const result = await this.fastgptClient.importContent(data);
          
          // 保存到历史记录
          const historyItem = {
            id: Date.now().toString(),
            content: data.content,
            type: data.type,
            source: data.source as any,
            timestamp: Date.now(),
            metadata: data.metadata,
            result
          };
          await this.historyManager.addItem(historyItem);
          
          // 显示通知 - 检查用户设置
          const ipcSettings = this.settingsManager.getSettings();
          if (ipcSettings.general.enableNotifications) {
            this.windowManager.showNotification(
              result.success ? '导入成功' : '导入失败',
              result.success ? '内容已成功导入到知识库' : (result.message || result.error || '')
            );
          }
          
          return result;
        } else {
          // 如果没有提供knowledgeBaseId，调用完整的导入逻辑（包含知识库选择）
          const importResult = await this.importContent(data.content, data.source || 'manual');
          return importResult;
        }
      } catch (error: any) {
        console.error('IPC导入内容失败:', error);
        return { 
          success: false, 
          message: error.message || '导入失败',
          error: error.message || '导入失败'
        };
      }
    });

    // 设置管理相关
    ipcMain.handle(IPCChannel.GET_SETTINGS, async () => {
      return this.settingsManager.getSettings();
    });

    ipcMain.handle(IPCChannel.SAVE_SETTINGS, async (event, settings) => {
      this.settingsManager.saveSettings(settings);
      // 重新配置 FastGPT 客户端
      this.fastgptClient.updateConfig(settings.fastgpt);
      // 重新注册快捷键
      await this.registerGlobalShortcuts();
    });

    // 历史记录相关
    ipcMain.handle(IPCChannel.GET_HISTORY, async () => {
      return this.historyManager.getHistory();
    });

    ipcMain.handle(IPCChannel.CLEAR_HISTORY, async () => {
      return this.historyManager.clearHistory();
    });

    // 系统相关
    ipcMain.handle(IPCChannel.SHOW_NOTIFICATION, async (event, title, body) => {
      this.windowManager.showNotification(title, body);
    });

    ipcMain.handle(IPCChannel.OPEN_EXTERNAL, async (event, url) => {
      shell.openExternal(url);
    });

    ipcMain.handle(IPCChannel.QUIT_APP, async () => {
      app.quit();
    });
  }
}

// 启动应用
new DiaFastGPTApp();