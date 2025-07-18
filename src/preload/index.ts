import { contextBridge, ipcRenderer } from 'electron'

// 定义暴露给渲染进程的API
const electronAPI = {
  // 窗口控制
  minimizeWindow: () => ipcRenderer.invoke('window-minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window-maximize'),
  closeWindow: () => ipcRenderer.invoke('window-close'),
  
  // 快捷键相关
  registerShortcuts: (shortcuts: any) => 
    ipcRenderer.invoke('register-shortcuts', shortcuts),
  unregisterShortcuts: () => 
    ipcRenderer.invoke('unregister-shortcuts'),
  
  // 内容处理
  getClipboardContent: () => ipcRenderer.invoke('get-clipboard-content'),
  // takeScreenshot: () => ipcRenderer.invoke('capture-screen'),  // 截图功能已移除
  // extractTextFromImage: (imageBuffer: any) => ipcRenderer.invoke('extract-text-from-image', imageBuffer), // 已移除OCR功能
  
  // FastGPT API
  testConnection: () => ipcRenderer.invoke('test-fastgpt-connection'),
  getKnowledgeBases: () => ipcRenderer.invoke('get-knowledge-bases'),
  importContent: (data: any) => ipcRenderer.invoke('import-content', data),
  
  // 设置管理
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings: any) => ipcRenderer.invoke('save-settings', settings),
  
  // 历史记录
  getHistory: () => ipcRenderer.invoke('get-history'),
  clearHistory: () => ipcRenderer.invoke('clear-history'),
  
  // 系统相关
  showNotification: (title: string, body: string) => ipcRenderer.invoke('show-notification', title, body),
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  quitApp: () => ipcRenderer.invoke('quit-app'),
  
  // 事件监听
  onShortcutTriggered: (callback: (type: string) => void) => {
    ipcRenderer.on('shortcut-triggered', (_, type) => callback(type))
  },
  
  onImportProgress: (callback: (progress: any) => void) => {
    ipcRenderer.on('import-progress', (_, progress) => callback(progress))
  },
  
  onSettingsChanged: (callback: (settings: any) => void) => {
    ipcRenderer.on('settings-changed', (_, settings) => callback(settings))
  },
  
  // 清理事件监听器
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel)
  }
}

// 定义类型声明
export type ElectronAPI = typeof electronAPI

// 将API暴露给渲染进程
contextBridge.exposeInMainWorld('electronAPI', electronAPI)

// 开发模式下的额外功能
if (process.env.NODE_ENV === 'development') {
  // 暴露一些调试功能
  contextBridge.exposeInMainWorld('electronDev', {
    openDevTools: () => ipcRenderer.invoke('dev-open-devtools'),
    reloadWindow: () => ipcRenderer.invoke('dev-reload-window'),
    getAppVersion: () => ipcRenderer.invoke('dev-get-version')
  })
}