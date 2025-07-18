import type { ElectronAPI } from '../../preload/index'

declare global {
  interface Window {
    electronAPI: ElectronAPI
    electronDev?: {
      openDevTools: () => Promise<void>
      reloadWindow: () => Promise<void>
      getAppVersion: () => Promise<string>
    }
  }
}

export {} 