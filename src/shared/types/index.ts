// 快捷键配置
export interface ShortcutConfig {
  // smartImport: string;        // 智能导入：已移除
  // quickImport: string;        // 快速导入：已移除
  // screenCapture: string;      // 截图导入：已移除
  clipboardImport: string;    // 剪贴板导入：默认 Ctrl+Shift+V
  fileImport: string;         // 文件导入：默认 Ctrl+Shift+F
  showPanel: string;          // 显示面板：默认 Ctrl+Shift+D
}

// 内容获取策略
export enum ContentSource {
  SELECTION = 'selection',      // 选中的文本
  CLIPBOARD = 'clipboard',      // 剪贴板内容
  // SCREEN = 'screen',           // 屏幕截图：已移除
  WINDOW = 'window',           // 当前窗口内容
  FILE = 'file'                // 文件内容
}

// 内容类型识别
export enum ContentType {
  TEXT = 'text',
  IMAGE = 'image',
  CODE = 'code',
  URL = 'url',
  FILE = 'file'
}

// 剪贴板内容
export interface ClipboardContent {
  text?: string;
  html?: string;
  image?: Uint8Array;
  rtf?: string;
}

// 内容元数据
export interface ContentMetadata {
  source: ContentSource;
  type: ContentType;
  timestamp: number;
  size: number;
  filename?: string;
  mimeType?: string;
  applicationName?: string;
  windowTitle?: string;
  url?: string;
  knowledgeBaseName?: string;  // 添加知识库名称字段
  originalPath?: string;       // 添加原始文件路径字段
}

// 导入数据结构
export interface ImportData {
  content: string;
  type: ContentType;
  source: string;
  metadata: ContentMetadata;
  knowledgeBaseId?: string; // 可选，如果未提供则由主进程处理知识库选择
}

// 文件导入数据结构
export interface FileImportData {
  filePath: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  knowledgeBaseId?: string;
}

// 文件验证结果
export interface FileValidationResult {
  valid: boolean;
  error?: string;
  supportedFormats?: string[];
  size?: number;
  type?: string;
}

// FastGPT 配置
export interface FastGPTConfig {
  baseUrl: string;
  apiKey: string;
  timeout?: number;
}

// 知识库信息
export interface KnowledgeBase {
  id: string;
  name: string;
  description?: string;
  type: string;
}

// 导入结果
export interface ImportResult {
  success: boolean;
  insertId?: string;
  message?: string;
  error?: string;
}

// 批量导入结果
export interface BatchResult {
  total: number;
  success: number;
  failed: number;
  results: ImportResult[];
}

// OCR 识别结果 (已移除OCR功能)
// export interface OCRResult { ... }

// 窗口信息
export interface WindowInfo {
  title: string;
  bundleId?: string;
  processName?: string;
  bounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

// 应用设置
export interface AppSettings {
  fastgpt: FastGPTConfig;
  shortcuts: ShortcutConfig;
  general: {
    autoStart: boolean;
    minimizeToTray: boolean;
    enableNotifications: boolean;
    autoCleanHistory: boolean;
  };
  advanced: {
    maxHistoryItems: number;
    enableDebugMode: boolean;
  };
}

// 历史记录项
export interface HistoryItem {
  id: string;
  content: string;
  type: ContentType;
  source: ContentSource;
  timestamp: number;
  metadata: ContentMetadata;
  result?: ImportResult;
}

// IPC 消息类型
export enum IPCChannel {
  // 快捷键相关
  REGISTER_SHORTCUTS = 'register-shortcuts',
  UNREGISTER_SHORTCUTS = 'unregister-shortcuts',
  SHORTCUT_TRIGGERED = 'shortcut-triggered',
  
  // 内容处理
  GET_CLIPBOARD_CONTENT = 'get-clipboard-content',
  // CAPTURE_SCREEN = 'capture-screen',  // 已移除截图功能
  // EXTRACT_TEXT_FROM_IMAGE = 'extract-text-from-image',  // 已移除OCR功能
  
  // 文件处理
  IMPORT_FILE = 'import-file',
  VALIDATE_FILE = 'validate-file',
  SHOW_FILE_DIALOG = 'show-file-dialog',
  
  // FastGPT 集成
  TEST_FASTGPT_CONNECTION = 'test-fastgpt-connection',
  GET_KNOWLEDGE_BASES = 'get-knowledge-bases',
  IMPORT_CONTENT = 'import-content',
  
  // 设置管理
  GET_SETTINGS = 'get-settings',
  SAVE_SETTINGS = 'save-settings',
  
  // 历史记录
  GET_HISTORY = 'get-history',
  CLEAR_HISTORY = 'clear-history',
  
  // 系统相关
  SHOW_NOTIFICATION = 'show-notification',
  OPEN_EXTERNAL = 'open-external',
  QUIT_APP = 'quit-app'
}

// IPC 消息结构
export interface IPCMessage<T = any> {
  channel: IPCChannel;
  data?: T;
  error?: string;
}

// 快捷键动作类型
export enum ShortcutAction {
  // SMART_IMPORT = 'smart-import',      // 已移除智能导入功能
  // QUICK_IMPORT = 'quick-import',      // 已移除快速导入功能
  // SCREEN_CAPTURE = 'screen-capture',  // 已移除截图功能
  CLIPBOARD_IMPORT = 'clipboard-import',
  FILE_IMPORT = 'file-import',
  SHOW_PANEL = 'show-panel'
}