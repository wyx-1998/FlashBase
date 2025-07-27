import { app, BrowserWindow, ipcMain, shell } from 'electron';
import * as path from 'path';
import { GlobalShortcutManager } from './shortcut';
import { TrayManager } from './tray';
import { WindowManager } from './window';
import { ContentExtractor } from './content';
import { FastGPTClient } from './api/fastgpt';
import { SettingsManager } from './settings';
import { HistoryManager } from './history';
import { AIKnowledgeBaseMatcher } from './ai-matcher';
import { IPCChannel, ShortcutAction, ContentType, ContentSource } from '../shared/types';
import { APP_INFO } from '../shared/constants';

class DiaFastGPTApp {
  private shortcutManager: GlobalShortcutManager;
  private trayManager: TrayManager;
  private windowManager: WindowManager;
  private contentExtractor: ContentExtractor;
  private fastgptClient: FastGPTClient;
  private aiMatcher: AIKnowledgeBaseMatcher;
  private settingsManager: SettingsManager;
  private historyManager: HistoryManager;
  private isQuitting = false;

  constructor() {
    this.shortcutManager = new GlobalShortcutManager();
    this.trayManager = new TrayManager();
    this.windowManager = new WindowManager();
    this.contentExtractor = new ContentExtractor();
    this.settingsManager = new SettingsManager();
    this.historyManager = new HistoryManager();
    
    // 初始化 FastGPT 客户端和AI匹配器
    const settings = this.settingsManager.getSettings();
    this.fastgptClient = new FastGPTClient(settings.fastgpt);
    this.aiMatcher = new AIKnowledgeBaseMatcher(settings.ai);
    
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

    app.on('before-quit', () => {
      this.isQuitting = true;
      (app as any).isQuitting = true;
      this.onAppQuit();
    });

    app.on('will-quit', (event) => {
      if (!this.isQuitting) {
        event.preventDefault();
      }
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
      
      // 设置窗口管理器引用
      this.trayManager.setWindowManager(this.windowManager);
      this.trayManager.setAppInstance(this);
      
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
   * 强制退出应用
   */
  public forceQuit(): void {
    this.isQuitting = true;
    (app as any).isQuitting = true;
    app.quit();
  }

  /**
   * 显示知识库选择对话框
   */
  private async showKnowledgeBaseSelection(knowledgeBases: any[]): Promise<any | null> {
    const { dialog } = require('electron');
    
    // 如果只有一个知识库，直接返回
    if (knowledgeBases.length === 1) {
      console.log(`只有一个知识库，自动选择: ${knowledgeBases[0].name}`);
      return knowledgeBases[0];
    }
    
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

  /**
   * 显示AI推荐对话框
   */
  private async showAIRecommendationDialog(matchResult: any, knowledgeBases: any[]): Promise<any | null> {
    const { dialog } = require('electron');
    
    const recommendations = matchResult.recommendations || [];
    const highConfidenceRecs = recommendations.filter((rec: any) => rec.confidence >= 70);
    
    let message = `AI智能分析结果:\n\n`;
    
    if (highConfidenceRecs.length > 1) {
      message += `发现 ${highConfidenceRecs.length} 个高置信度推荐(≥70%):\n\n`;
    } else if (highConfidenceRecs.length === 1) {
      message += `推荐知识库:\n\n`;
    } else {
      message += `所有推荐置信度较低(<70%)，需要人工审核:\n\n`;
    }
    
    // 显示推荐列表
    recommendations.forEach((rec: any, index: number) => {
      const indicator = rec.confidence >= 70 ? '🟢' : '🟡';
      message += `${indicator} ${rec.knowledgeBase} (${rec.confidence}%)\n`;
      message += `   理由: ${rec.reason}\n\n`;
    });
    
    // 构建按钮选项
    const buttons: string[] = [];
    const buttonActions: string[] = [];
    
    if (highConfidenceRecs.length > 1) {
      // 多个高置信度推荐时，提供批量导入选项
      buttons.push(`批量导入所有高置信度推荐(${highConfidenceRecs.length}个)`);
      buttonActions.push('batch');
      
      message += `\n选择操作:\n`;
      message += `• 批量导入: 同时导入到所有高置信度推荐的知识库\n`;
      message += `• 单个导入: 选择一个知识库进行导入\n`;
    }
    
    // 添加单个知识库选项
    recommendations.forEach((rec: any) => {
      const kb = knowledgeBases.find((k: any) => k.name === rec.knowledgeBase);
      if (kb) {
        buttons.push(`导入到: ${rec.knowledgeBase}`);
        buttonActions.push('import');
      }
    });
    
    buttons.push('取消');
    buttonActions.push('cancel');
    
    const result = await dialog.showMessageBox(this.windowManager.getMainWindow()!, {
      type: 'question',
      title: 'AI智能推荐',
      message: message,
      buttons: buttons,
      defaultId: 0,
      cancelId: buttons.length - 1,
      alwaysOnTop: true
    });
    
    const action = buttonActions[result.response];
    
    if (action === 'cancel') {
      return null;
    } else if (action === 'batch') {
      // 返回批量导入信息
      const targetKnowledgeBases = highConfidenceRecs.map((rec: any) => 
        knowledgeBases.find((kb: any) => kb.name === rec.knowledgeBase)
      ).filter((kb: any) => kb);
      
      return {
        action: 'batch',
        knowledgeBases: targetKnowledgeBases
      };
    } else if (action === 'import') {
      // 计算选择的知识库索引（减去批量导入按钮的偏移）
      const kbIndex = highConfidenceRecs.length > 1 ? result.response - 1 : result.response;
      const selectedRec = recommendations[kbIndex];
      const targetKnowledgeBase = knowledgeBases.find((kb: any) => kb.name === selectedRec.knowledgeBase);
      
      return {
        action: 'import',
        knowledgeBase: targetKnowledgeBase
      };
    }
    
    return null;
  }

  /**
   * 执行批量导入操作
   */
  private async performBatchImport(
    content: string,
    source: string,
    targetKnowledgeBases: any[],
    matchResult?: any
  ): Promise<{ success: boolean; message?: string; error?: string; results?: any[] }> {
    try {
      console.log(`开始执行批量导入: 目标知识库数量=${targetKnowledgeBases.length}`);
      console.log('目标知识库:', targetKnowledgeBases.map(kb => kb.name));
      
      const results = [];
      const successCount = { count: 0 };
      const failureCount = { count: 0 };
      
      // 并行导入到所有目标知识库
      const importPromises = targetKnowledgeBases.map(async (kb) => {
        try {
          const importData = {
            content: content,
            type: source === 'file' ? ContentType.FILE : ContentType.TEXT,
            source: source,
            metadata: {
              source: source === 'file' ? ContentSource.FILE : ContentSource.CLIPBOARD,
              type: source === 'file' ? ContentType.FILE : ContentType.TEXT,
              timestamp: Date.now(),
              size: content.length,
              knowledgeBaseName: kb.name,
              importType: 'ai-batch',
              aiMatchResult: matchResult
            },
            knowledgeBaseId: kb.id
          };
          
          const result = await this.fastgptClient.importContent(importData);
          console.log(`导入到 ${kb.name} 的结果:`, result);
          
          if (result.success) {
            successCount.count++;
          } else {
            failureCount.count++;
          }
          
          return {
            knowledgeBase: kb,
            result: result
          };
        } catch (error: any) {
          console.error(`导入到 ${kb.name} 失败:`, error);
          failureCount.count++;
          return {
            knowledgeBase: kb,
            result: {
              success: false,
              error: error.message || '导入失败'
            }
          };
        }
      });
      
      const importResults = await Promise.all(importPromises);
      results.push(...importResults);
      
      // 保存批量导入历史记录
      const historyItem = {
        id: Date.now().toString(),
        content: content,
        type: (source === 'file' ? ContentType.FILE : ContentType.TEXT) as any,
        source: source as any,
        timestamp: Date.now(),
        metadata: {
          source: (source === 'file' ? ContentSource.FILE : ContentSource.CLIPBOARD) as any,
          type: (source === 'file' ? ContentType.FILE : ContentType.TEXT) as any,
          timestamp: Date.now(),
          size: content.length,
          knowledgeBaseName: targetKnowledgeBases.map(kb => kb.name).join(', '),
          importType: 'ai-batch',
          aiMatchResult: matchResult,
          batchResults: results
        },
        result: {
          success: successCount.count > 0,
          message: `批量导入完成: 成功 ${successCount.count}/${targetKnowledgeBases.length}`,
          batchResults: results
        }
      };
      await this.historyManager.addItem(historyItem);
      
      // 显示通知
      const appSettings = this.settingsManager.getSettings();
      if (appSettings.general.enableNotifications) {
        let notificationTitle = '批量导入完成';
        let notificationMessage = '';
        
        if (failureCount.count === 0) {
          notificationMessage = `成功导入到 ${successCount.count} 个知识库: ${targetKnowledgeBases.map(kb => kb.name).join(', ')}`;
        } else if (successCount.count === 0) {
          notificationTitle = '批量导入失败';
          notificationMessage = `所有 ${targetKnowledgeBases.length} 个知识库导入均失败`;
        } else {
          notificationMessage = `部分成功: ${successCount.count}/${targetKnowledgeBases.length} 个知识库导入成功`;
        }
        
        this.windowManager.showNotification(notificationTitle, notificationMessage);
      }
      
      return {
        success: successCount.count > 0,
        message: `批量导入完成: 成功 ${successCount.count}/${targetKnowledgeBases.length}`,
        results: results
      };
      
    } catch (error: any) {
      console.error('执行批量导入失败:', error);
      return {
        success: false,
        message: error.message || '批量导入失败',
        error: error.message || '批量导入失败'
      };
    }
  }

  /**
   * 执行导入操作
   */
  private async performImport(
    content: string, 
    source: string, 
    targetKnowledgeBase: any, 
    importType: 'manual' | 'ai-auto' | 'ai-manual',
    matchResult?: any
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      console.log(`开始执行导入: 类型=${importType}, 目标知识库=${targetKnowledgeBase.name}`);
      
      // 构建导入数据
      const importData = {
        content: content,
        type: source === 'file' ? ContentType.FILE : ContentType.TEXT,
        source: source,
        metadata: {
            source: source === 'file' ? ContentSource.FILE : ContentSource.CLIPBOARD,
            type: source === 'file' ? ContentType.FILE : ContentType.TEXT,
            timestamp: Date.now(),
            size: content.length,
            knowledgeBaseName: targetKnowledgeBase.name,
            importType: importType,
            aiMatchResult: matchResult
          },
        knowledgeBaseId: targetKnowledgeBase.id
      };
      
      // 调用FastGPT API导入
      const result = await this.fastgptClient.importContent(importData);
      console.log('导入结果:', result);
      
      // 保存到历史记录
      const historyItem = {
        id: Date.now().toString(),
        content: content,
        type: importData.type as any,
        source: importData.source as any,
        timestamp: Date.now(),
        metadata: importData.metadata,
        result
      };
      await this.historyManager.addItem(historyItem);
      
      // 显示通知
      const appSettings = this.settingsManager.getSettings();
      if (appSettings.general.enableNotifications) {
        let notificationTitle = result.success ? '导入成功' : '导入失败';
        let notificationMessage = '';
        
        if (result.success) {
          switch (importType) {
            case 'ai-auto':
              notificationMessage = `AI自动导入到: ${targetKnowledgeBase.name} (置信度: ${matchResult?.finalChoice?.confidence}%)`;
              break;
            case 'ai-manual':
              notificationMessage = `AI推荐导入到: ${targetKnowledgeBase.name}`;
              break;
            default:
              notificationMessage = `已导入到知识库: ${targetKnowledgeBase.name}`;
          }
        } else {
          notificationMessage = result.message || result.error || '导入失败';
        }
        
        this.windowManager.showNotification(notificationTitle, notificationMessage);
      }
      
      return result;
      
    } catch (error: any) {
      console.error('执行导入失败:', error);
      return {
        success: false,
        message: error.message || '导入失败',
        error: error.message || '导入失败'
      };
    }
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
    // 剪贴板导入：使用AI智能导入剪贴板内容
    const clipboardContent = await this.contentExtractor.getClipboardContent();
    if (clipboardContent.text) {
      // 显示AI分析开始通知
      const settings = this.settingsManager.getSettings();
      if (settings.general.enableNotifications) {
        this.windowManager.showNotification(
          'AI智能分析',
          '正在分析剪贴板内容，匹配最适合的知识库...'
        );
      }
      
      const result = await this.importContent(clipboardContent.text, 'clipboard');
      console.log('AI智能导入结果:', result);
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
      
      console.log(`开始AI智能处理文件: ${fileName}, 扩展名: ${fileExtension}, 大小: ${stats.size} 字节`);
      
      // 读取文件内容用于AI分析
      let fileContent = '';
      try {
        // 对于文本文件，读取内容进行AI分析
        if (['.txt', '.md', '.js', '.ts', '.py', '.java', '.cpp', '.c', '.css', '.html', '.json', '.xml'].includes(fileExtension)) {
          fileContent = fs.readFileSync(filePath, 'utf8');
          console.log(`读取文本文件内容，长度: ${fileContent.length}`);
        } else {
          // 对于其他文件类型，使用文件名和基本信息作为分析内容
          fileContent = `文件名: ${fileName}\n文件类型: ${fileExtension}\n文件大小: ${stats.size} 字节`;
          console.log('非文本文件，使用文件信息作为分析内容');
        }
      } catch (readError) {
        console.warn('读取文件内容失败，使用文件信息:', readError);
        fileContent = `文件名: ${fileName}\n文件类型: ${fileExtension}\n文件大小: ${stats.size} 字节`;
      }
      
      // 显示AI分析开始通知
      const settings = this.settingsManager.getSettings();
      if (settings.general.enableNotifications) {
        this.windowManager.showNotification(
          'AI智能分析',
          `正在分析文件 ${fileName}，匹配最适合的知识库...`
        );
      }
      
      // 使用AI智能导入
      const result = await this.importContent(fileContent, 'file');
      
      console.log(`文件 ${fileName} AI智能导入结果:`, result);
      
    } catch (error) {
      console.error(`AI智能导入文件 ${filePath} 失败:`, error);
      
      // 显示错误通知
      const settings = this.settingsManager.getSettings();
      if (settings.general.enableNotifications) {
        this.windowManager.showNotification(
          '文件导入失败',
          error instanceof Error ? error.message : '未知错误'
        );
      }
      
      throw error;
    }
  }

  private async importContentWithData(importData: any): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      console.log(`开始导入内容: 类型=${importData.type}, 来源=${importData.source}`);
      console.log('导入数据详情:', {
        type: importData.type,
        hasMetadata: !!importData.metadata,
        originalPath: importData.metadata?.originalPath,
        contentPreview: importData.content.substring(0, 100)
      });
      
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

      // 显示知识库选择对话框
      const targetKnowledgeBase = await this.showKnowledgeBaseSelection(writableKnowledgeBases);
      if (!targetKnowledgeBase) {
        console.log('用户取消了知识库选择');
        throw new Error('用户取消了知识库选择');
      }
      console.log(`用户选择了知识库: ${targetKnowledgeBase.name}`);
      
      console.log(`开始调用FastGPT API导入内容到知识库: ${targetKnowledgeBase.name} (ID: ${targetKnowledgeBase.id})`);
      
      // 使用完整的 importData 对象，包含 originalPath
      const fullImportData = {
        ...importData,
        knowledgeBaseId: targetKnowledgeBase.id
      };
      
      const result = await this.fastgptClient.importContent(fullImportData);

      console.log('导入结果:', result);

      // 保存到历史记录
      console.log('开始保存历史记录...');
      const historyItem = {
        id: Date.now().toString(),
        content: importData.content,
        type: importData.type,
        source: importData.source,
        timestamp: Date.now(),
        metadata: {
          ...importData.metadata,
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
      
      return result;
    } catch (error: any) {
      console.error('导入内容失败:', error);
      return {
        success: false,
        message: error.message || '导入失败',
        error: error.message || '导入失败'
      };
    }
  }



  private async importContent(content: string, source: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      console.log(`=== 开始AI智能导入 ===`);
      console.log(`内容来源: ${source}, 内容长度: ${content.length}`);
      
      // 获取有写权限的知识库
      const appSettings = this.settingsManager.getSettings();
      console.log('获取应用设置完成');
      
      // 获取所有知识库并筛选有权限的
      console.log('正在获取知识库列表...');
      const allKnowledgeBases = await this.fastgptClient.getKnowledgeBases();
      console.log(`获取到 ${allKnowledgeBases.length} 个知识库`);
      
      if (allKnowledgeBases.length === 0) {
        throw new Error('没有可用的知识库');
      }

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

      // 使用AI智能匹配知识库
      let targetKnowledgeBase = null;
      let matchResult = null;
      
      // 检查AI配置是否完整
      const allSettings = this.settingsManager.getSettings();
      const aiSettings = allSettings.ai;
      console.log('=== AI配置检查 ===');
      console.log('完整设置对象:', JSON.stringify(allSettings, null, 2));
      console.log('AI设置:', JSON.stringify(aiSettings, null, 2));
      console.log('baseUrl存在:', !!aiSettings?.baseUrl);
      console.log('baseUrl值:', aiSettings?.baseUrl);
      console.log('apiKey存在:', !!aiSettings?.apiKey);
      console.log('apiKey值长度:', aiSettings?.apiKey?.length || 0);
      
      if (!aiSettings || !aiSettings.baseUrl || !aiSettings.apiKey) {
        console.log('AI配置不完整，跳过AI智能匹配');
        console.log('缺失项目:', {
          aiSettings: !aiSettings,
          baseUrl: !aiSettings?.baseUrl,
          apiKey: !aiSettings?.apiKey
        });
        
        // 显示AI配置不完整的通知
        const settings = this.settingsManager.getSettings();
        if (settings.general.enableNotifications) {
          this.windowManager.showNotification(
            'AI配置未完成',
            '请在设置中配置AI模型信息以启用智能匹配功能，现在将使用手动选择模式'
          );
        }
        
        // 直接进入手动选择
        targetKnowledgeBase = await this.showKnowledgeBaseSelection(writableKnowledgeBases);
        if (!targetKnowledgeBase) {
          console.log('用户取消了知识库选择');
          throw new Error('用户取消了知识库选择');
        }
        return await this.performImport(content, source, targetKnowledgeBase, 'manual', null);
      }
      
      try {
        console.log('开始AI智能匹配知识库...');
        matchResult = await this.aiMatcher.matchKnowledgeBase(content, writableKnowledgeBases);
        console.log('AI匹配结果:', matchResult);
        
        if (matchResult.success && matchResult.recommendations && matchResult.recommendations.length > 0) {
          // 分析高置信度推荐
          const highConfidenceRecs = matchResult.recommendations.filter(rec => rec.confidence >= 70);
          console.log(`AI推荐结果: 总数=${matchResult.recommendations.length}, 高置信度(>=70%)=${highConfidenceRecs.length}`);
          
          if (highConfidenceRecs.length === 0) {
            // 没有高置信度推荐，直接进入手动选择
            console.log('所有AI推荐的置信度均低于70%，跳过推荐对话框，直接进入手动选择');
            
            // 显示置信度不足的通知
            const settings = this.settingsManager.getSettings();
            if (settings.general.enableNotifications) {
              this.windowManager.showNotification(
                'AI推荐置信度不足',
                '所有推荐的置信度均低于70%，请手动选择知识库'
              );
            }
            
            // 直接进入手动选择
            targetKnowledgeBase = await this.showKnowledgeBaseSelection(writableKnowledgeBases);
            if (!targetKnowledgeBase) {
              console.log('用户取消了知识库选择');
              throw new Error('用户取消了知识库选择');
            }
            return await this.performImport(content, source, targetKnowledgeBase, 'manual', null);
          } else if (highConfidenceRecs.length === 1) {
            // 只有一个高置信度推荐，自动导入
            const finalChoice = highConfidenceRecs[0];
            targetKnowledgeBase = writableKnowledgeBases.find(kb => kb.name === finalChoice.knowledgeBase);
            if (!targetKnowledgeBase) {
              console.log(`AI推荐的知识库 "${finalChoice.knowledgeBase}" 未找到，回退到手动选择`);
              throw new Error('AI推荐的知识库未找到');
            }
            console.log(`✓ 单个高置信度推荐 ${finalChoice.confidence}%，自动导入到: ${targetKnowledgeBase.name}`);
            return await this.performImport(content, source, targetKnowledgeBase, 'ai-auto', matchResult);
          } else {
            // 多个高置信度推荐，显示对话框让用户选择
            console.log(`多个高置信度推荐(${highConfidenceRecs.length}个)，需要用户选择`);
            const result = await this.showAIRecommendationDialog(matchResult, writableKnowledgeBases);
            if (!result) {
              console.log('用户取消了知识库选择');
              throw new Error('用户取消了知识库选择');
            }
            if (result.action === 'import') {
              return await this.performImport(content, source, result.knowledgeBase, 'ai-manual', matchResult);
            } else {
              return await this.performBatchImport(content, source, result.knowledgeBases, matchResult);
            }
          }
        } else {
          console.log('AI匹配失败，回退到手动选择');
          throw new Error('AI匹配失败');
        }
      } catch (aiError: any) {
        console.warn('AI匹配过程出错，回退到手动选择:', aiError);
        
        // 显示AI分析失败的通知
        const settings = this.settingsManager.getSettings();
        if (settings.general.enableNotifications) {
          let errorMessage = 'AI智能分析失败，将使用手动选择模式';
          
          // 根据错误类型提供更具体的提示
          if (aiError.message && aiError.message.includes('AI配置不完整')) {
            errorMessage = 'AI配置不完整，请在设置中配置AI模型信息';
          } else if (aiError.message && aiError.message.includes('连接失败')) {
            errorMessage = 'AI服务连接失败，请检查网络和配置';
          } else if (aiError.message && aiError.message.includes('认证失败')) {
            errorMessage = 'AI服务认证失败，请检查API密钥';
          }
          
          this.windowManager.showNotification(
            'AI分析失败',
            errorMessage
          );
        }
        
        // AI匹配失败，回退到手动选择
        targetKnowledgeBase = await this.showKnowledgeBaseSelection(writableKnowledgeBases);
        if (!targetKnowledgeBase) {
          console.log('用户取消了知识库选择');
          throw new Error('用户取消了知识库选择');
        }
        return await this.performImport(content, source, targetKnowledgeBase, 'manual', null);
      }
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
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.ppt': 'application/vnd.ms-powerpoint',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.txt': 'text/plain',
      '.md': 'text/markdown',
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.ts': 'application/typescript',
      '.json': 'application/json',
      '.xml': 'application/xml',
      '.csv': 'text/csv',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.bmp': 'image/bmp',
      '.svg': 'image/svg+xml',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.mp4': 'video/mp4',
      '.avi': 'video/x-msvideo',
      '.zip': 'application/zip',
      '.rar': 'application/x-rar-compressed',
      '.7z': 'application/x-7z-compressed'
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
        
        // 对于所有文件类型，都使用文件上传功能
        // 构建导入数据，包含文件路径用于真正的文件上传
        const importData = {
          content: `文件名: ${fileName}\n文件大小: ${stats.size} 字节\n文件路径: ${filePath}`, // 临时内容，实际会被uploadFile方法忽略
          type: 'file' as any,
          source: 'file',
          metadata: {
            source: 'file' as any,
            type: 'file' as any,
            timestamp: Date.now(),
            size: stats.size, // 使用文件实际大小
            filename: fileName,
            mimeType: this.getMimeType(fileExtension),
            originalPath: filePath // 关键：确保传递文件路径
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
          // 传递完整的 importData 对象，保留 originalPath 信息
          return await this.importContentWithData(importData);
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

    // 测试AI连接
    ipcMain.handle(IPCChannel.TEST_AI_CONNECTION, async (_, config) => {
      try {
        // 如果传入了config参数，使用传入的配置；否则使用设置中的配置
        let aiConfig = config;
        if (!aiConfig) {
          const settings = this.settingsManager.getSettings();
          aiConfig = settings.ai;
        }
        
        if (!aiConfig || !aiConfig.baseUrl || !aiConfig.apiKey) {
          return {
            success: false,
            message: '请先填写 AI 模型配置信息（API地址和密钥）'
          };
        }

        console.log('开始AI连接测试...');
        console.log('测试配置:', {
          baseUrl: aiConfig.baseUrl,
          model: aiConfig.model,
          hasApiKey: !!aiConfig.apiKey,
          timeout: aiConfig.timeout
        });

        // 构建测试端点
        let testEndpoint = aiConfig.baseUrl;
        if (!testEndpoint.endsWith('/')) {
          testEndpoint += '/';
        }
        
        // 尝试不同的端点路径
        const endpointsToTry = [
          `${testEndpoint}v1/models`,
          `${testEndpoint}models`,
          `${testEndpoint}v1/chat/completions`
        ];

        let lastError: any = null;
        let responseDetails: any = null;

        for (const endpoint of endpointsToTry) {
          try {
            console.log(`尝试连接端点: ${endpoint}`);
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), aiConfig.timeout || 30000);
            
            const response = await fetch(endpoint, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${aiConfig.apiKey}`,
                'Content-Type': 'application/json',
                'User-Agent': 'FlashBase/1.0'
              },
              signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            console.log(`端点 ${endpoint} 响应状态: ${response.status}`);
            console.log('响应头:', Object.fromEntries(response.headers.entries()));
            
            responseDetails = {
              status: response.status,
              statusText: response.statusText,
              headers: Object.fromEntries(response.headers.entries()),
              endpoint: endpoint
            };

            if (response.ok) {
              try {
                const data = await response.json();
                console.log('连接成功，响应数据:', data);
                return { 
                  success: true, 
                  message: `AI 模型连接测试成功！\n端点: ${endpoint}\n状态: ${response.status}`,
                  models: data.data?.map((model: any) => model.id) || [],
                  endpoint: endpoint
                };
              } catch (jsonError) {
                console.log('JSON解析失败，但连接成功');
                return {
                  success: true,
                  message: `AI 模型连接测试成功！\n端点: ${endpoint}\n状态: ${response.status}\n注意: 响应不是标准JSON格式`,
                  endpoint: endpoint
                };
              }
            } else {
              // 尝试读取错误响应
              let errorText = '';
              try {
                errorText = await response.text();
                console.log('错误响应内容:', errorText.substring(0, 500));
              } catch (e) {
                console.log('无法读取错误响应');
              }
              
              lastError = {
                status: response.status,
                statusText: response.statusText,
                endpoint: endpoint,
                responseText: errorText.substring(0, 200)
              };
              
              // 如果是认证错误，不再尝试其他端点
              if (response.status === 401 || response.status === 403) {
                break;
              }
            }
          } catch (fetchError: any) {
            console.error(`端点 ${endpoint} 连接失败:`, fetchError);
            lastError = {
              endpoint: endpoint,
              error: fetchError.message,
              code: fetchError.code,
              name: fetchError.name
            };
          }
        }

        // 所有端点都失败，分析错误原因
        console.error('所有端点连接失败，最后错误:', lastError);
        
        let errorMessage = 'AI连接测试失败';
        let diagnosticInfo = '';
        
        if (lastError) {
          if (lastError.status === 401) {
            errorMessage = 'API密钥认证失败';
            diagnosticInfo = '请检查API密钥是否正确，是否有访问权限';
          } else if (lastError.status === 403) {
            errorMessage = 'API访问被拒绝';
            diagnosticInfo = '请检查API密钥权限或账户余额';
          } else if (lastError.status === 404) {
            errorMessage = 'API端点不存在';
            diagnosticInfo = `请检查API地址是否正确\n尝试的端点: ${endpointsToTry.join(', ')}`;
          } else if (lastError.status >= 500) {
            errorMessage = 'AI服务器内部错误';
            diagnosticInfo = `服务器返回 ${lastError.status} 错误，请稍后重试`;
          } else if (lastError.name === 'AbortError') {
            errorMessage = '连接超时';
            diagnosticInfo = `请检查网络连接或增加超时时间（当前: ${aiConfig.timeout || 30000}ms）`;
          } else if (lastError.code === 'ECONNREFUSED') {
            errorMessage = '连接被拒绝';
            diagnosticInfo = '请检查API地址是否正确，服务是否正在运行';
          } else if (lastError.code === 'ENOTFOUND') {
            errorMessage = '域名解析失败';
            diagnosticInfo = '请检查API地址是否正确，网络连接是否正常';
          } else if (lastError.code === 'ECONNRESET') {
            errorMessage = '连接被重置';
            diagnosticInfo = '网络连接不稳定，请检查网络环境';
          } else if (lastError.responseText && lastError.responseText.includes('<html')) {
            errorMessage = 'API返回HTML页面';
            diagnosticInfo = 'API地址可能指向了网页而不是API接口，请检查地址是否正确';
          }
        }
        
        const fullMessage = diagnosticInfo ? `${errorMessage}\n\n诊断信息:\n${diagnosticInfo}` : errorMessage;
        
        return { 
          success: false, 
          message: fullMessage,
          diagnostics: {
            testedEndpoints: endpointsToTry,
            lastError: lastError,
            responseDetails: responseDetails,
            config: {
              baseUrl: aiConfig.baseUrl,
              hasApiKey: !!aiConfig.apiKey,
              timeout: aiConfig.timeout
            }
          }
        };
      } catch (error: any) {
        console.error('AI连接测试异常:', error);
        return { 
          success: false, 
          message: `连接测试异常: ${error.message || '未知错误'}\n\n请检查网络连接和配置信息`
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

    // AI 智能匹配
    ipcMain.handle(IPCChannel.AI_MATCH_KNOWLEDGE_BASE, async (event, content: string) => {
      try {
        const knowledgeBases = await this.fastgptClient.getKnowledgeBases();
        if (!knowledgeBases || knowledgeBases.length === 0) {
          return {
            success: false,
            error: '无法获取知识库列表'
          };
        }

        const matches = await this.aiMatcher.matchKnowledgeBase(content, knowledgeBases);
        return {
          success: true,
          matches
        };
      } catch (error: any) {
        console.error('AI匹配失败:', error);
        return {
          success: false,
          error: error.message || 'AI匹配失败'
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
      // 更新 AI 匹配器配置
      this.aiMatcher.updateConfig(settings.ai);
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