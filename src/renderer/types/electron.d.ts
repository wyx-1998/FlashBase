import type { ElectronAPI } from '../../preload/index'

declare global {
  interface Window {
    electronAPI: ElectronAPI
    electronDev?: {
      openDevTools: () => Promise<void>
      reloadWindow: () => Promise<void>
      getAppVersion: () => Promise<string>
    }
    // 文件处理
    showFileDialog: () => Promise<{ canceled: boolean; filePaths: string[] }>;
    validateFile: (filePath: string) => Promise<{ valid: boolean; error?: string; size?: number; type?: string }>;
    importFile: (fileData: { filePath: string; content: string; type: string; size: number; datasetId: string }) => Promise<{ success: boolean; error?: string; result?: any }>;
  }
}

export {}