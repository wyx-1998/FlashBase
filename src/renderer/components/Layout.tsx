import React, { useState } from 'react'
import './Layout.css'

// 直接嵌入SVG图标作为React组件
const Icons = {
  home: () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
    </svg>
  ),
  settings: () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
      <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/>
    </svg>
  ),
  history: () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
      <path d="M13,3A9,9 0 0,0 4,12H1L4.89,15.89L4.96,16.03L9,12H6A7,7 0 0,1 13,5A7,7 0 0,1 20,12A7,7 0 0,1 13,19C11.07,19 9.32,18.21 8.06,16.94L6.64,18.36C8.27,20 10.5,21 13,21A9,9 0 0,0 22,12A9,9 0 0,0 13,3M12,8V13L16.28,15.54L17,14.33L13.5,12.25V8H12Z"/>
    </svg>
  ),
  about: () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
      <path d="M11,9H13V7H11M12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20,12C20,16.41 16.41,20 12,20M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M11,17H13V11H11V17Z"/>
    </svg>
  ),
  bolt: () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" fill="none" width="32" height="32">
      <defs>
        <linearGradient id="flashGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4FC3F7" stopOpacity="1"/>
          <stop offset="50%" stopColor="#29B6F6" stopOpacity="0.9"/>
          <stop offset="100%" stopColor="#0288D1" stopOpacity="0.8"/>
        </linearGradient>
        <linearGradient id="coreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1"/>
          <stop offset="100%" stopColor="#E3F2FD" stopOpacity="0.9"/>
        </linearGradient>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#0288D1" floodOpacity="0.3"/>
        </filter>
      </defs>
      
      {/* 外圈发光环 */}
      <circle cx="20" cy="20" r="18" fill="none" stroke="url(#flashGradient)" strokeWidth="1" opacity="0.4" filter="url(#glow)"/>
      
      {/* 背景圆形 */}
      <circle cx="20" cy="20" r="16" fill="url(#flashGradient)" filter="url(#shadow)" opacity="0.9"/>
      
      {/* 主闪电图标 */}
      <path d="M22 8L14 20h5l-3 12 8-12h-5l3-12z" fill="url(#coreGradient)" filter="url(#glow)" strokeWidth="0.5" stroke="#FFFFFF"/>
      
      {/* 装饰性能量点 */}
      <circle cx="28" cy="12" r="1.5" fill="#FFFFFF" opacity="0.8">
        <animate attributeName="opacity" values="0.4;1;0.4" dur="2s" repeatCount="indefinite"/>
      </circle>
      <circle cx="32" cy="18" r="1" fill="#4FC3F7" opacity="0.6">
        <animate attributeName="opacity" values="0.3;0.8;0.3" dur="1.5s" repeatCount="indefinite" begin="0.5s"/>
      </circle>
      <circle cx="8" cy="28" r="1.2" fill="#FFFFFF" opacity="0.7">
        <animate attributeName="opacity" values="0.5;1;0.5" dur="1.8s" repeatCount="indefinite" begin="1s"/>
      </circle>
      
      {/* 中心高光 */}
      <circle cx="20" cy="20" r="3" fill="#FFFFFF" opacity="0.3"/>
      <circle cx="18" cy="18" r="1.5" fill="#FFFFFF" opacity="0.6"/>
    </svg>
  )
}

interface LayoutProps {
  children: React.ReactNode
}

export interface NavigationItem {
  id: string
  label: string
  icon: string
  component?: React.ComponentType
}

interface LayoutContextType {
  activeTab: string
  setActiveTab: (tab: string) => void
}

export const LayoutContext = React.createContext<LayoutContextType>({
  activeTab: 'home',
  setActiveTab: () => {}
})

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [activeTab, setActiveTab] = useState('home')

  const navigationItems: NavigationItem[] = [
    { id: 'home', label: '首页', icon: 'home' },
    { id: 'settings', label: '设置', icon: 'settings' },
    { id: 'history', label: '历史记录', icon: 'history' },
    { id: 'about', label: '关于', icon: 'about' }
  ]

  return (
    <LayoutContext.Provider value={{ activeTab, setActiveTab }}>
      <div className="layout">
        <div className="layout-sidebar">
          <div className="sidebar-header">
            <Icons.bolt />
          </div>
          <nav className="sidebar-nav">
            {navigationItems.map(item => (
              <button
                key={item.id}
                className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
                onClick={() => setActiveTab(item.id)}
              >
                <div className="nav-icon">
                  {Icons[item.icon as keyof typeof Icons]()}
                </div>
                <span className="nav-label">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
        <div className="layout-main">
          <div className="main-content">
            {children}
          </div>
        </div>
      </div>
    </LayoutContext.Provider>
  )
}

export default Layout