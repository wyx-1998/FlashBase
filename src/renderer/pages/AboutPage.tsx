import React, { useState, useEffect } from 'react'
import { useElectron } from '../hooks/useElectron'
import { APP_INFO } from '../../shared/constants'
import type { AppSettings } from '../../shared/types'
import './AboutPage.css'

const AboutPage: React.FC = () => {
  const electron = useElectron()
  const [settings, setSettings] = useState<AppSettings | null>(null)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const loadedSettings = await electron.getSettings()
      setSettings(loadedSettings)
    } catch (error) {
      console.error('加载设置失败:', error)
    }
  }

  const getShortcuts = () => {
    if (!settings?.shortcuts) {
      return [
        // 智能导入和快速导入功能已移除
        // { action: '智能导入', key: 'Ctrl+Shift+I', desc: '优先导入选中文本，否则导入剪贴板内容' },
        // { action: '快速导入', key: 'Ctrl+Shift+F', desc: '直接导入剪贴板内容' },
        { action: ' 剪贴板导入', key: 'Ctrl+Shift+V', desc: '导入剪贴板文本内容' },
        { action: ' 显示面板', key: 'Ctrl+Shift+D', desc: '显示快速操作面板' }
      ]
    }
    
    return [
      // 智能导入和快速导入功能已移除
      // { action: '智能导入', key: settings.shortcuts.smartImport, desc: '优先导入选中文本，否则导入剪贴板内容' },
      // { action: '快速导入', key: settings.shortcuts.quickImport, desc: '直接导入剪贴板内容' },
      { action: ' 剪贴板导入', key: settings.shortcuts.clipboardImport, desc: '导入剪贴板文本内容' },
      { action: ' 显示面板', key: settings.shortcuts.showPanel, desc: '显示快速操作面板' }
    ]
  }

  const handleOpenGitHub = () => {
    try {
      electron.openExternal(APP_INFO.homepage)
    } catch (error) {
      window.open(APP_INFO.homepage, '_blank')
    }
  }

  return (
    <div className="about-page">
      <div className="about-header">
        <div className="app-logo">🤖</div>
        <h1>{APP_INFO.name}</h1>
        <p className="app-version">版本 {APP_INFO.version}</p>
        <p className="app-description">{APP_INFO.description}</p>
      </div>

      <div className="about-content">
        <section className="about-section">
          <h2>🎯 产品介绍</h2>
          <p>
            FlashBase 桌面应用是一个强大的内容导入工具，通过系统级快捷键，
            让您可以在任何应用中快速将内容导入到 FastGPT 知识库。
          </p>
          <ul>
            <li>🚀 系统级快捷键支持，无需切换应用</li>
            <li>📝 智能内容识别，支持文本、图片、代码等</li>
            {/* <li>🔍 OCR 文字识别，截图内容自动提取</li> 已移除OCR功能 */}
            <li>📋 剪贴板实时监控，内容获取更便捷</li>
            <li>📊 导入历史记录，操作过程可追溯</li>
          </ul>
        </section>

        <section className="about-section">
          <h2>⌨️ 快捷键说明</h2>
          <div className="shortcuts-list">
            {getShortcuts().map((shortcut, index) => (
              <div key={index} className="shortcut-item">
                <div className="shortcut-action">{shortcut.action}</div>
                <div className="shortcut-key">{shortcut.key}</div>
                <div className="shortcut-desc">{shortcut.desc}</div>
              </div>
            ))}
          </div>
        </section>



        <section className="about-section">
          <h2>📝 使用指南</h2>
          <ol>
            <li>在设置页面配置您的 FastGPT 服务器地址和 API 密钥</li>
            <li>根据需要调整快捷键设置</li>
            <li>在任何应用中使用快捷键快速导入内容</li>
            <li>在历史记录页面查看导入结果</li>
          </ol>
        </section>



        <section className="about-section">
          <h2>💝 致谢</h2>
          <p>感谢以下开源项目的支持：</p>
          <ul>
            <li>FastGPT - 强大的知识库管理系统</li>
            <li>Electron - 跨平台桌面应用开发框架</li>
            <li>React - 用户界面构建库</li>
            <li>TypeScript - JavaScript 的超集</li>
          </ul>
        </section>
      </div>

      <div className="about-footer">
        <p>© 2025 小伢儿 team. All rights reserved.</p>
        <p>Made with ❤️ for FastGPT Community</p>
      </div>
    </div>
  )
}

export default AboutPage