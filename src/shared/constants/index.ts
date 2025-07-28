import { ShortcutConfig, AppSettings } from '../types';

// 默认快捷键配置
export const DEFAULT_SHORTCUTS: ShortcutConfig = {
  // smartImport: 'CommandOrControl+Shift+I',   // 智能导入功能已移除
  // quickImport: 'CommandOrControl+Shift+F',   // 快速导入功能已移除
  // screenCapture: 'CommandOrControl+Shift+S', // 截图功能已移除
  clipboardImport: 'CommandOrControl+Shift+V',
  fileImport: 'CommandOrControl+Shift+F',
  showPanel: 'CommandOrControl+Shift+D'
};

// 默认应用设置
export const DEFAULT_SETTINGS: AppSettings = {
  fastgpt: {
    baseUrl: '',
    apiKey: '',
    timeout: 10000
  },
  ai: {
    baseUrl: '',
    apiKey: '',
    model: 'gpt-3.5-turbo',
    timeout: 30000
  },
  shortcuts: DEFAULT_SHORTCUTS,
  general: {
    autoStart: false,
    minimizeToTray: true,
    enableNotifications: true,
    autoCleanHistory: false
  },
  advanced: {
    // ocrLanguages: ['chi_sim', 'eng'], // 已移除OCR功能
    maxHistoryItems: 100,
    enableDebugMode: false
  }
};

// 应用信息
export const APP_INFO = {
  name: 'FlashBase',
  version: '2.0.0',
  description: '快速导入内容到 FastGPT 知识库的桌面应用',
  homepage: 'https://github.com/wyx-1998/FlashBase'
};

// 窗口配置
export const WINDOW_CONFIG = {
  main: {
    width: 800,
    height: 600,
    minWidth: 600,
    minHeight: 400
  },
  panel: {
    width: 400,
    height: 300,
    alwaysOnTop: true,
    frame: false,
    transparent: true
  },
  settings: {
    width: 700,
    height: 500,
    resizable: false
  }
};

// API 端点
export const API_ENDPOINTS = {
  KNOWLEDGE_BASES: '/api/core/dataset/list',
  IMPORT_DATA: '/api/core/dataset/data/pushData',  // 修复：使用正确的 API 端点
  TEST_CONNECTION: '/api/core/dataset/list'  // 使用知识库列表接口来测试连接
};

// 文件类型支持
export const SUPPORTED_FILE_TYPES = {
  images: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'],
  documents: ['.txt', '.md', '.doc', '.docx', '.pdf'],
  code: ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cpp', '.c', '.css', '.html']
};

// OCR 配置 (已移除OCR功能)
// export const OCR_CONFIG = { ... };

// 通知配置
export const NOTIFICATION_CONFIG = {
  timeout: 3000,
  position: 'top-right' as const,
  types: {
    SUCCESS: 'success',
    ERROR: 'error',
    WARNING: 'warning',
    INFO: 'info'
  }
};

// 历史记录配置
export const HISTORY_CONFIG = {
  maxItems: 100,
  cleanupInterval: 24 * 60 * 60 * 1000, // 24小时
  retention: 7 * 24 * 60 * 60 * 1000    // 7天
};

// 错误代码
export const ERROR_CODES = {
  FASTGPT_CONNECTION_FAILED: 'FASTGPT_CONNECTION_FAILED',
  FASTGPT_AUTH_FAILED: 'FASTGPT_AUTH_FAILED',
  FASTGPT_IMPORT_FAILED: 'FASTGPT_IMPORT_FAILED',
  SHORTCUT_REGISTER_FAILED: 'SHORTCUT_REGISTER_FAILED',
  // OCR_FAILED: 'OCR_FAILED', // 已移除OCR功能
  CLIPBOARD_ACCESS_FAILED: 'CLIPBOARD_ACCESS_FAILED',
  // SCREEN_CAPTURE_FAILED: 'SCREEN_CAPTURE_FAILED' // 截图功能已移除
  FILE_IMPORT_FAILED: 'FILE_IMPORT_FAILED',
  FILE_VALIDATION_FAILED: 'FILE_VALIDATION_FAILED',
  FILE_READ_FAILED: 'FILE_READ_FAILED'
};