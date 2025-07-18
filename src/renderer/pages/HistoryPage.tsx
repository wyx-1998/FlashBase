import React, { useState, useEffect } from 'react'
import { useElectron } from '../hooks/useElectron'
import type { HistoryItem } from '../../shared/types'
import './HistoryPage.css'

const HistoryPage: React.FC = () => {
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [selectedType, setSelectedType] = useState('all')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  
  const electron = useElectron()

  useEffect(() => {
    loadHistory()
  }, [])

  const loadHistory = async () => {
    try {
      const items = await electron.getHistory()
      setHistory(items || [])
    } catch (error) {
      console.error('加载历史记录失败:', error)
      setMessage({ type: 'error', text: '加载历史记录失败' })
    } finally {
      setIsLoading(false)
    }
  }

  const clearHistory = async () => {
    if (!window.confirm('确定要清除所有历史记录吗？此操作不可恢复。')) {
      return
    }
    
    try {
      await electron.clearHistory()
      setHistory([])
      setMessage({ type: 'success', text: '历史记录已清除' })
    } catch (error) {
      console.error('清除历史记录失败:', error)
      setMessage({ type: 'error', text: '清除历史记录失败' })
    }
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'text': return '📝'
      case 'image': return '🖼️'
      case 'code': return '💻'
      case 'url': return '🔗'
      case 'file': return '📄'
      default: return '📄'
    }
  }

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'selection': return '🎯'
      case 'clipboard': return '📋'
      case 'screen': return '📸'
      case 'file': return '📁'
      default: return '📄'
    }
  }

  const filteredHistory = history.filter(item => {
    const matchesFilter = !filter || 
      item.content.toLowerCase().includes(filter.toLowerCase()) ||
      (item.metadata.filename && item.metadata.filename.toLowerCase().includes(filter.toLowerCase()))
    
    const matchesType = selectedType === 'all' || item.type === selectedType
    
    return matchesFilter && matchesType
  })

  const types = ['all', ...Array.from(new Set(history.map(item => item.type)))]

  if (isLoading) {
    return <div className="history-loading">加载历史记录中...</div>
  }

  return (
    <div className="history-page">
      <div className="history-header">
        <div className="header-content">
          <h1>历史记录</h1>
          <p>查看您的内容导入历史</p>
        </div>
        <div className="header-actions">
          <button onClick={clearHistory} className="clear-button">
            清除历史记录
          </button>
        </div>
      </div>

      {message && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="history-filters">
        <div className="filter-group">
          <input
            type="text"
            placeholder="搜索内容..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="search-input"
          />
        </div>
        
        <div className="filter-group">
          <label>类型筛选:</label>
          <select 
            value={selectedType} 
            onChange={(e) => setSelectedType(e.target.value)}
            className="type-select"
          >
            {types.map(type => (
              <option key={type} value={type}>
                {type === 'all' ? '全部' : type}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="history-stats">
        <div className="stat-item">
          <span className="stat-label">总记录数:</span>
          <span className="stat-value">{history.length}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">筛选结果:</span>
          <span className="stat-value">{filteredHistory.length}</span>
        </div>
      </div>

      {filteredHistory.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📝</div>
          <h3>暂无历史记录</h3>
          <p>
            {filter || selectedType !== 'all' 
              ? '没有找到匹配的记录，请尝试调整筛选条件'
              : '开始使用快捷键导入内容，记录将显示在这里'
            }
          </p>
        </div>
      ) : (
        <div className="history-list">
          {filteredHistory.map(item => (
            <div key={item.id} className="history-item">
              <div className="item-header">
                <div className="item-meta">
                  <span className="item-type">
                    {getTypeIcon(item.type)} {item.type}
                  </span>
                  <span className="item-source">
                    {getSourceIcon(item.source)} {item.source}
                  </span>
                  <span className="item-date">
                    {formatDate(item.timestamp)}
                  </span>
                </div>
                <div className="item-status">
                  {item.result?.success ? (
                    <span className="status-success">✅ 成功</span>
                  ) : (
                    <span className="status-error">❌ 失败</span>
                  )}
                </div>
              </div>
              
              <div className="item-content">
                <div className="content-preview">
                  {item.content.length > 200 
                    ? `${item.content.substring(0, 200)}...`
                    : item.content
                  }
                </div>
              </div>
              
              {item.metadata.filename && (
                <div className="item-filename">
                  📄 {item.metadata.filename}
                </div>
              )}
              
              {item.result?.message && (
                <div className={`item-message ${item.result.success ? 'success' : 'error'}`}>
                  {item.result.message}
                </div>
              )}
              
              <div className="item-details">
                <span>大小: {item.metadata.size} 字符</span>
                {item.metadata.knowledgeBaseName && (
                  <span>知识库: {item.metadata.knowledgeBaseName}</span>
                )}
                {item.metadata.applicationName && (
                  <span>来源应用: {item.metadata.applicationName}</span>
                )}
                {item.metadata.windowTitle && (
                  <span>窗口: {item.metadata.windowTitle}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default HistoryPage