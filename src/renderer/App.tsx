import React, { useContext } from 'react'
import Layout, { LayoutContext } from './components/Layout'
import HomePage from './pages/HomePage'
import SettingsPage from './pages/SettingsPage'
import HistoryPage from './pages/HistoryPage'
import AboutPage from './pages/AboutPage'

const AppContent: React.FC = () => {
  const { activeTab } = useContext(LayoutContext)

  const renderCurrentPage = () => {
    switch (activeTab) {
      case 'home':
        return <HomePage />
      case 'settings':
        return <SettingsPage />
      case 'history':
        return <HistoryPage />
      case 'about':
        return <AboutPage />
      default:
        return <HomePage />
    }
  }

  return renderCurrentPage()
}

const App: React.FC = () => {
  return (
    <Layout>
      <AppContent />
    </Layout>
  )
}

export default App 