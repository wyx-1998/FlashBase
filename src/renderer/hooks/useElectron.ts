import { useCallback, useEffect, useState } from 'react'
import type { AppSettings, HistoryItem, KnowledgeBase, ImportData, ImportResult, ClipboardContent, FileImportData, FileValidationResult, AIConfig } from '../../shared/types'

export const useElectron = () => {
  // 获取设置
  const getSettings = useCallback(async (): Promise<AppSettings> => {
    return window.electronAPI?.getSettings() || {}
  }, [])

  // 保存设置
  const saveSettings = useCallback(async (settings: AppSettings): Promise<void> => {
    return window.electronAPI?.saveSettings(settings)
  }, [])

  // 获取历史记录
  const getHistory = useCallback(async (): Promise<HistoryItem[]> => {
    return window.electronAPI?.getHistory() || []
  }, [])

  // 清除历史记录
  const clearHistory = useCallback(async (): Promise<void> => {
    return window.electronAPI?.clearHistory()
  }, [])

  // 获取知识库列表
  const getKnowledgeBases = useCallback(async (): Promise<KnowledgeBase[]> => {
    return window.electronAPI?.getKnowledgeBases() || []
  }, [])

  // 导入内容到知识库
  const importContent = useCallback(async (data: ImportData): Promise<ImportResult> => {
    return window.electronAPI?.importContent(data) || { success: false }
  }, [])

  // 获取剪贴板内容
  const getClipboardContent = useCallback(async (): Promise<ClipboardContent> => {
    return window.electronAPI?.getClipboardContent() || {}
  }, [])

  // 显示文件选择对话框
  const showFileDialog = useCallback(async (): Promise<{ canceled: boolean; filePaths: string[] }> => {
    return window.electronAPI?.showFileDialog() || { canceled: true, filePaths: [] }
  }, [])

  // 验证文件
  const validateFile = useCallback(async (filePath: string): Promise<FileValidationResult> => {
    return window.electronAPI?.validateFile(filePath) || { valid: false, error: '验证失败' }
  }, [])

  // 导入文件
  const importFile = useCallback(async (fileData: FileImportData): Promise<ImportResult> => {
    return window.electronAPI?.importFile(fileData) || { success: false }
  }, [])

  // 截图功能已移除
  // const takeScreenshot = useCallback(async (): Promise<Buffer | null> => {
  //   return null
  // }, [])

  // 测试FastGPT连接
  const testConnection = useCallback(async (): Promise<{ success: boolean; message?: string }> => {
    try {
      const result = await window.electronAPI?.testConnection()
      return result || { success: false, message: '连接失败' }
    } catch (error) {
      return { success: false, message: `连接失败: ${error}` }
    }
  }, [])

  // 测试AI模型连接
  const testAIConnection = useCallback(async (config: AIConfig): Promise<{ success: boolean; message?: string }> => {
    try {
      const result = await window.electronAPI?.testAIConnection(config)
      return result || { success: false, message: 'AI连接失败' }
    } catch (error) {
      return { success: false, message: `AI连接失败: ${error}` }
    }
  }, [])

  // 显示通知
  const showNotification = useCallback((title: string, body: string) => {
    // 使用 Electron 系统级通知
    window.electronAPI?.showNotification(title, body)
  }, [])

  // 退出应用
  const quitApp = useCallback(async (): Promise<void> => {
    return window.electronAPI?.quitApp()
  }, [])

  // 打开外部链接
  const openExternal = useCallback(async (url: string): Promise<void> => {
    return window.electronAPI?.openExternal(url)
  }, [])

  return {
    getSettings,
    saveSettings,
    getHistory,
    clearHistory,
    getKnowledgeBases,
    importContent,
    getClipboardContent,
    showFileDialog,
    validateFile,
    importFile,
    // takeScreenshot,  // 截图功能已移除
    testConnection,
    testAIConnection,
    showNotification,
    quitApp,
    openExternal
  }
}