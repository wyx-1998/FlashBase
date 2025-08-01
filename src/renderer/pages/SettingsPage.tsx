import React, { useState, useEffect } from 'react'
import { useElectron } from '../hooks/useElectron'
import type { AppSettings } from '../../shared/types'
import { DEFAULT_SETTINGS } from '../../shared/constants'
import './SettingsPage.css'

const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [activeTab, setActiveTab] = useState('fastgpt')
  const [isTestingConnection, setIsTestingConnection] = useState(false)
  const [isTestingAIConnection, setIsTestingAIConnection] = useState(false)
  
  const electron = useElectron()
  const { showNotification } = electron

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const loadedSettings = await electron.getSettings()
      setSettings({ ...DEFAULT_SETTINGS, ...loadedSettings })
    } catch (error) {
      console.error('加载设置失败:', error)
      setMessage({ type: 'error', text: '加载设置失败' })
    } finally {
      setIsLoading(false)
    }
  }

  const saveSettings = async () => {
    setIsSaving(true)
    setMessage(null)
    
    try {
      await electron.saveSettings(settings)
      setMessage({ type: 'success', text: '设置已保存' })
      // 显示系统通知
      if (settings.general.enableNotifications) {
        showNotification('FlashBase', '设置已保存')
      }
    } catch (error) {
      console.error('保存设置失败:', error)
      setMessage({ type: 'error', text: '保存设置失败' })
    } finally {
      setIsSaving(false)
    }
  }

  const testConnection = async () => {
    if (!settings.fastgpt.baseUrl || !settings.fastgpt.apiKey) {
      setMessage({ type: 'error', text: '请先填写 FastGPT 配置信息' })
      return
    }

    setIsTestingConnection(true)
    setMessage(null)
    try {
      const response = await fetch(`${settings.fastgpt.baseUrl}/api/core/dataset/list`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${settings.fastgpt.apiKey}`,
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(settings.fastgpt.timeout)
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'FastGPT 连接测试成功！' })
      } else {
        setMessage({ type: 'error', text: `连接失败: ${response.status} ${response.statusText}` })
      }
    } catch (error) {
      console.error('Connection test failed:', error)
      if (error instanceof Error) {
        if (error.name === 'TimeoutError') {
          setMessage({ type: 'error', text: '连接超时，请检查网络或增加超时时间' })
        } else {
          setMessage({ type: 'error', text: `连接失败: ${error.message}` })
        }
      } else {
        setMessage({ type: 'error', text: '连接失败，请检查配置' })
      }
    } finally {
      setIsTestingConnection(false)
    }
  }

  const testAIConnection = async () => {
    if (!settings.ai?.baseUrl || !settings.ai?.apiKey) {
      setMessage({ type: 'error', text: '请先填写 AI 模型配置信息' })
      return
    }

    setIsTestingAIConnection(true)
    setMessage(null)
    try {
      // 测试连接
      const result = await electron.testAIConnection(settings.ai)
      setMessage({ 
        type: result.success ? 'success' : 'error', 
        text: result.message || '测试完成' 
      })
    } catch (error) {
      setMessage({ type: 'error', text: 'AI连接测试失败' })
    } finally {
      setIsTestingAIConnection(false)
    }
  }

  const handleInputChange = (path: string, value: any) => {
    setSettings(prev => {
      const newSettings = { ...prev }
      const keys = path.split('.')
      let current: any = newSettings
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {}
        current = current[keys[i]]
      }
      
      current[keys[keys.length - 1]] = value
      return newSettings
    })
  }

  if (isLoading) {
    return <div className="settings-loading">加载设置中...</div>
  }

  const tabs = [
    { id: 'fastgpt', label: 'FastGPT 配置', icon: '🤖' },
    { id: 'aimodel', label: 'AI 模型配置', icon: '🧠' },
    { id: 'shortcuts', label: '快捷键设置', icon: '⌨️' },
    { id: 'general', label: '常规设置', icon: '⚙️' },
    { id: 'advanced', label: '高级设置', icon: '🔧' }
  ]

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1>应用设置</h1>
        <p>配置您的 FlashBase 桌面应用</p>
      </div>

      {message && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="settings-container">
        <div className="settings-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="settings-content">
          {activeTab === 'fastgpt' && (
            <div className="tab-panel">
              <h2>FastGPT 服务配置</h2>
              <div className="form-group">
                <label htmlFor="baseUrl">服务器地址</label>
                <input
                  id="baseUrl"
                  type="url"
                  value={settings.fastgpt.baseUrl}
                  onChange={(e) => handleInputChange('fastgpt.baseUrl', e.target.value)}
                  placeholder="https://your-fastgpt-server.com"
                />
                <small>请输入您的 FastGPT 服务器地址</small>
              </div>
              
              <div className="form-group">
                <label htmlFor="apiKey">API 密钥</label>
                <input
                  id="apiKey"
                  type="password"
                  value={settings.fastgpt.apiKey}
                  onChange={(e) => handleInputChange('fastgpt.apiKey', e.target.value)}
                  placeholder="输入您的 API 密钥"
                />
                <small>在 FastGPT 个人中心获取您的 API 密钥</small>
              </div>
              
              <div className="form-group">
                <label htmlFor="timeout">超时时间 (毫秒)</label>
                <input
                  id="timeout"
                  type="number"
                  value={settings.fastgpt.timeout}
                  onChange={(e) => handleInputChange('fastgpt.timeout', parseInt(e.target.value))}
                  min="1000"
                  max="60000"
                  step="1000"
                />
                <small>API 请求的超时时间，默认 10 秒</small>
              </div>
              
              <div className="form-actions">
                <button 
                  onClick={testConnection} 
                  disabled={isTestingConnection || !settings.fastgpt.baseUrl || !settings.fastgpt.apiKey}
                  className="test-button"
                >
                  {isTestingConnection ? '测试中...' : '测试连接'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'aimodel' && (
            <div className="tab-panel">
              <h2>AI 模型配置</h2>
              <p>配置用于智能知识库选择的 AI 模型服务</p>
              
              <div className="form-group">
                <label htmlFor="aiBaseUrl">API 地址</label>
                <input
                  id="aiBaseUrl"
                  type="url"
                  value={settings.ai?.baseUrl || ''}
                  onChange={(e) => handleInputChange('ai.baseUrl', e.target.value)}
                  placeholder="https://api.openai.com"
                />
                <small>AI 模型服务的 API 地址（支持带/v1或不带/v1的地址，如：https://api.openai.com 或 https://api.openai.com/v1）</small>
              </div>
              
              <div className="form-group">
                <label htmlFor="aiApiKey">API 密钥</label>
                <input
                  id="aiApiKey"
                  type="password"
                  value={settings.ai?.apiKey || ''}
                  onChange={(e) => handleInputChange('ai.apiKey', e.target.value)}
                  placeholder="sk-..."
                />
                <small>AI 模型服务的 API 密钥</small>
              </div>
              
              <div className="form-group">
                <label htmlFor="aiModel">模型名称</label>
                <input
                  id="aiModel"
                  type="text"
                  value={settings.ai?.model || ''}
                  onChange={(e) => handleInputChange('ai.model', e.target.value)}
                  placeholder="gpt-3.5-turbo"
                />
                <small>要使用的 AI 模型名称</small>
              </div>
              
              <div className="form-group">
                <label htmlFor="aiTimeout">超时时间 (毫秒)</label>
                <input
                  id="aiTimeout"
                  type="number"
                  value={settings.ai?.timeout || 30000}
                  onChange={(e) => handleInputChange('ai.timeout', parseInt(e.target.value))}
                  min="1000"
                  max="60000"
                  step="1000"
                />
                <small>API 请求的超时时间，默认 30 秒</small>
              </div>
              
              <div className="form-actions">
                <button 
                  onClick={testAIConnection} 
                  disabled={isTestingAIConnection || !settings.ai?.baseUrl || !settings.ai?.apiKey}
                  className="test-button"
                >
                  {isTestingAIConnection ? '测试中...' : '测试连接'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'shortcuts' && (
            <div className="tab-panel">
              <h2>快捷键配置</h2>
              <p>设置全局快捷键，在任何应用中都可以使用</p>
              
              <div className="shortcut-list">
                {/* 智能导入和快速导入功能已移除 */}
                {/* <div className="shortcut-item">
                  <div className="shortcut-info">
                    <strong>智能导入</strong>
                    <small>优先导入选中文本，否则导入剪贴板内容</small>
                  </div>
                  <input
                    type="text"
                    value={settings.shortcuts.smartImport}
                    onChange={(e) => handleInputChange('shortcuts.smartImport', e.target.value)}
                    placeholder="Ctrl+Shift+I"
                  />
                </div>
                
                <div className="shortcut-item">
                  <div className="shortcut-info">
                    <strong>快速导入</strong>
                    <small>直接导入剪贴板内容</small>
                  </div>
                  <input
                    type="text"
                    value={settings.shortcuts.quickImport}
                    onChange={(e) => handleInputChange('shortcuts.quickImport', e.target.value)}
                    placeholder="Ctrl+Shift+F"
                  />
                </div> */}
                
                {/* 截图功能已移除 */}
                {/* <div className="shortcut-item">
                  <div className="shortcut-info">
                    <strong>截图导入</strong>
                    <small>截图功能已移除</small>
                  </div>
                  <input
                    type="text"
                    value={settings.shortcuts.screenCapture}
                    onChange={(e) => handleInputChange('shortcuts.screenCapture', e.target.value)}
                    placeholder="Ctrl+Shift+S"
                  />
                </div> */}
                
                <div className="shortcut-item">
                  <div className="shortcut-info">
                    <strong>剪贴板导入</strong>
                    <small>导入剪贴板文本内容</small>
                  </div>
                  <input
                    type="text"
                    value={settings.shortcuts.clipboardImport}
                    onChange={(e) => handleInputChange('shortcuts.clipboardImport', e.target.value)}
                    placeholder="Ctrl+Shift+V"
                  />
                </div>
                
                <div className="shortcut-item">
                  <div className="shortcut-info">
                    <strong>文件导入</strong>
                    <small>选择文件导入到知识库</small>
                  </div>
                  <input
                    type="text"
                    value={settings.shortcuts.fileImport}
                    onChange={(e) => handleInputChange('shortcuts.fileImport', e.target.value)}
                    placeholder="Ctrl+Shift+F"
                  />
                </div>
                
                <div className="shortcut-item">
                  <div className="shortcut-info">
                    <strong>显示面板</strong>
                    <small>显示快速操作面板</small>
                  </div>
                  <input
                    type="text"
                    value={settings.shortcuts.showPanel}
                    onChange={(e) => handleInputChange('shortcuts.showPanel', e.target.value)}
                    placeholder="Ctrl+Shift+D"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'general' && (
            <div className="tab-panel">
              <h2>常规设置</h2>
              
              <div className="checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={settings.general.autoStart}
                    onChange={(e) => handleInputChange('general.autoStart', e.target.checked)}
                  />
                  <span>开机自启动</span>
                </label>
                
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={settings.general.minimizeToTray}
                    onChange={(e) => handleInputChange('general.minimizeToTray', e.target.checked)}
                  />
                  <span>最小化到系统托盘</span>
                </label>
                
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={settings.general.enableNotifications}
                    onChange={(e) => handleInputChange('general.enableNotifications', e.target.checked)}
                  />
                  <span>启用通知</span>
                </label>
                
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={settings.general.autoCleanHistory}
                    onChange={(e) => handleInputChange('general.autoCleanHistory', e.target.checked)}
                  />
                  <span>自动清理历史记录</span>
                </label>
              </div>
            </div>
          )}

          {activeTab === 'advanced' && (
            <div className="tab-panel">
              <h2>高级设置</h2>
              
              <div className="form-group">
                <label htmlFor="maxHistoryItems">最大历史记录数</label>
                <input
                  id="maxHistoryItems"
                  type="number"
                  value={settings.advanced.maxHistoryItems}
                  onChange={(e) => handleInputChange('advanced.maxHistoryItems', parseInt(e.target.value))}
                  min="10"
                  max="1000"
                />
                <small>保留的历史记录最大数量</small>
              </div>
              
              <div className="checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={settings.advanced.enableDebugMode}
                    onChange={(e) => handleInputChange('advanced.enableDebugMode', e.target.checked)}
                  />
                  <span>启用调试模式</span>
                </label>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="settings-footer">
        <button 
          onClick={saveSettings} 
          disabled={isSaving}
          className="save-button"
        >
          {isSaving ? '保存中...' : '保存设置'}
        </button>
      </div>
    </div>
  )
}

export default SettingsPage