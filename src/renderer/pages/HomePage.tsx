import React, { useState, useEffect } from 'react'
import { useElectron } from '../hooks/useElectron'
import type { AppSettings, ClipboardContent } from '../../shared/types'
import { ContentType, ContentSource } from '../../shared/types'
import './HomePage.css'

const HomePage: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [clipboardContent, setClipboardContent] = useState<ClipboardContent | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)
  const [clipboardMessage, setClipboardMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)
  const [fileImportMessage, setFileImportMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)
  
  const electron = useElectron()

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const loadedSettings = await electron.getSettings()
      // 确保设置对象有默认结构
      const defaultSettings = {
        fastgpt: { baseUrl: '', apiKey: '', timeout: 10000 },
        general: { enableNotifications: true }
      }
      
      const safeSettings = {
        ...defaultSettings,
        ...loadedSettings,
        fastgpt: {
          ...defaultSettings.fastgpt,
          ...loadedSettings?.fastgpt
        },
        general: {
          ...defaultSettings.general,
          ...loadedSettings?.general
        }
      }
      setSettings(safeSettings)
    } catch (error) {
      console.error('加载设置失败:', error)
      // 设置默认值
      setSettings({
        fastgpt: { baseUrl: '', apiKey: '', timeout: 10000 },
        general: { enableNotifications: true }
      } as any)
    }
  }

  const handleClipboardImport = async () => {
    setMessage(null)
    setClipboardMessage(null)
    setIsLoading(true)
    try {
      const clipboardData = await electron.getClipboardContent()
      if (clipboardData.text) {
        setClipboardContent(clipboardData)
        setClipboardMessage({ type: 'info', text: '剪贴板内容已获取，请点击下方内容进行导入' })
      } else {
        setMessage({ type: 'info', text: '剪贴板中没有文本内容' })
      }
    } catch (error) {
      console.error('获取剪贴板内容失败:', error)
      setMessage({ type: 'error', text: '获取剪贴板内容失败' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleImportClipboard = async () => {
    if (!clipboardContent?.text) {
      setClipboardMessage({ type: 'error', text: '没有可导入的剪贴板内容' })
      return
    }

    setClipboardMessage(null)
    setIsLoading(true)
    try {
      console.log('开始导入剪贴板内容:', clipboardContent.text.substring(0, 100))
      
      // 不指定knowledgeBaseId，让主进程处理知识库选择（包括单个知识库的情况也会显示选择对话框）
      const result = await electron.importContent({
        content: clipboardContent.text,
        type: ContentType.TEXT,
        source: 'clipboard',
        metadata: {
          source: ContentSource.CLIPBOARD,
          type: ContentType.TEXT,
          timestamp: Date.now(),
          size: clipboardContent.text.length
        }
        // 不指定knowledgeBaseId，强制显示知识库选择
      })
      
      console.log('导入结果:', result)
      
      if (result && result.success) {
        setClipboardMessage({ type: 'success', text: '剪贴板内容导入成功！' })
        // 延迟清空剪贴板预览，让用户看到成功提示
        setTimeout(() => {
          setClipboardContent(null)
          setClipboardMessage(null)
        }, 3000)
      } else {
        // 显示详细的错误信息
        const errorMessage = result?.message || result?.error || '导入失败，请检查网络连接和配置'
        console.error('导入失败:', errorMessage)
        setClipboardMessage({ type: 'error', text: errorMessage })
      }
    } catch (error: any) {
      console.error('剪贴板导入异常:', error)
      const errorMessage = error?.message || '导入过程中发生异常，请重试'
      setClipboardMessage({ type: 'error', text: errorMessage })
    } finally {
      setIsLoading(false)
    }
  }

  // 截图功能已完全移除
  // const handleScreenCapture = async () => {
  //   // 截图功能已移除
  // }

  const handleFileImport = async () => {
    setMessage(null)
    setFileImportMessage(null)
    setIsLoading(true)
    
    try {
      // 显示文件选择对话框
      const fileResult = await electron.showFileDialog()
      
      if (fileResult.canceled || fileResult.filePaths.length === 0) {
        setFileImportMessage({ type: 'info', text: '已取消文件选择' })
        return
      }
      
      // 导入选中的文件
      for (const filePath of fileResult.filePaths) {
        try {
          // 验证文件
          const validation = await electron.validateFile(filePath)
          if (!validation.valid) {
            setFileImportMessage({ 
              type: 'error', 
              text: `文件验证失败: ${validation.error}` 
            })
            continue
          }
          
          // 导入文件
          const result = await electron.importFile({ filePath })
          
          if (result && result.success) {
            setFileImportMessage({ 
              type: 'success', 
              text: `文件导入成功: ${filePath.split('/').pop()}` 
            })
          } else {
            const errorMessage = result?.error || '文件导入失败'
            setFileImportMessage({ type: 'error', text: errorMessage })
          }
        } catch (error: any) {
          console.error('文件导入异常:', error)
          setFileImportMessage({ 
            type: 'error', 
            text: `文件导入失败: ${error.message || '未知错误'}` 
          })
        }
      }
    } catch (error: any) {
      console.error('文件导入过程异常:', error)
      setFileImportMessage({ 
        type: 'error', 
        text: `文件导入失败: ${error.message || '未知错误'}` 
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleTestConnection = async () => {
    setIsLoading(true)
    setMessage(null)
    
    try {
      const result = await electron.testConnection()
      setMessage({ 
        type: result.success ? 'success' : 'error', 
        text: result.message || '测试完成' 
      })
    } catch (error) {
      setMessage({ type: 'error', text: '连接测试失败' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="home-page">
      <div className="home-header">
        <h1>欢迎使用 FlashBase 桌面应用</h1>
        <p>通过系统级快捷键快速导入内容到您的知识库</p>
      </div>

      {message && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="quick-actions">
        <h2>快捷操作</h2>
        <div className="action-grid">
          <button 
            className="action-card"
            onClick={handleClipboardImport}
            disabled={isLoading}
          >
            <div className="action-icon">📋</div>
            <div className="action-content">
              <h3>剪贴板导入</h3>
              <p>导入当前剪贴板内容到知识库</p>
              <small>快捷键: {settings?.shortcuts?.clipboardImport || 'Ctrl+Shift+V'}</small>
            </div>
          </button>

          <button 
            className="action-card"
            onClick={handleFileImport}
            disabled={isLoading}
          >
            <div className="action-icon">📁</div>
            <div className="action-content">
              <h3>文件导入</h3>
              <p>选择文件导入到知识库</p>
              <small>快捷键: {settings?.shortcuts?.fileImport || 'Ctrl+Shift+F'}</small>
            </div>
          </button>

          <button 
            className="action-card"
            onClick={handleTestConnection}
            disabled={isLoading}
          >
            <div className="action-icon">🔗</div>
            <div className="action-content">
              <h3>连接测试</h3>
              <p>测试 FastGPT 服务连接状态</p>
              <small>验证API配置是否正确</small>
            </div>
          </button>
        </div>
        
        {/* 文件导入消息提示 */}
        {fileImportMessage && (
          <div className={`message ${fileImportMessage.type}`}>
            {fileImportMessage.text}
          </div>
        )}
        
        {/* 剪贴板预览区域移到按钮下方 */}
        {clipboardContent?.text && (
          <div className="clipboard-preview-section">
            <h3>剪贴板内容预览</h3>
            
            {/* 剪贴板区域的消息提示 */}
            {clipboardMessage && (
              <div className={`clipboard-message ${clipboardMessage.type}`}>
                {clipboardMessage.text}
              </div>
            )}
            
            <div className="content-preview-container">
              <div 
                className="content-preview clickable"
                onClick={handleImportClipboard}
                title="点击导入到知识库"
              >
                <div className="preview-header">
                  <span className="preview-title">📋 剪贴板内容</span>
                  <span className="preview-size">({clipboardContent.text.length} 字符)</span>
                </div>
                <div className="preview-content">
                  <pre>{clipboardContent.text.substring(0, 500)}</pre>
                  {clipboardContent.text.length > 500 && (
                    <div className="preview-more">...（显示前500字符，点击导入完整内容）</div>
                  )}
                </div>
                <div className="preview-action">
                  <span className="action-hint">💡 点击此区域导入到知识库</span>
                </div>
              </div>
              <div className="preview-actions">
                <button 
                  className="btn-primary"
                  onClick={handleImportClipboard}
                  disabled={isLoading}
                >
                  {isLoading ? '导入中...' : '导入到知识库'}
                </button>
                <button 
                  className="btn-secondary"
                  onClick={() => {
                    setClipboardContent(null)
                    setClipboardMessage(null)
                  }}
                  disabled={isLoading}
                >
                  清除预览
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {settings && (
        <div className="status-section">
          <h2>系统状态</h2>
          <div className="status-grid">
            <div className="status-item">
              <span className="status-label">FastGPT 服务器:</span>
              <span className="status-value">
                {settings.fastgpt.baseUrl || '未配置'}
              </span>
            </div>
            <div className="status-item">
              <span className="status-label">API 密钥:</span>
              <span className="status-value">
                {settings.fastgpt.apiKey ? '已配置' : '未配置'}
              </span>
            </div>
            <div className="status-item">
              <span className="status-label">通知:</span>
              <span className="status-value">
                {settings.general.enableNotifications ? '已启用' : '已禁用'}
              </span>
            </div>
          </div>
        </div>
      )}


    </div>
  )
}

export default HomePage