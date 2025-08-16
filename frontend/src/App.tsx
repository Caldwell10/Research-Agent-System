import React, { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { WebSocketProvider } from '@/contexts/WebSocketContext'
import Layout from '@/components/Layout'
import HomePage from '@/pages/HomePage'
import ResearchPage from '@/pages/ResearchPage'
import HistoryPage from '@/pages/HistoryPage'
import FavoritesPage from '@/pages/FavoritesPage'
import ErrorBoundary from '@/components/ErrorBoundary'
import ToastContainer from '@/components/ToastContainer'
import usePWA from '@/hooks/usePWA'
import useToast from '@/hooks/useToast'
import useOfflineManager from '@/hooks/useOfflineManager'

function AppContent() {
  const { isInstallable, install, requestNotificationPermission } = usePWA()
  const { toasts, hideToast, showInfo } = useToast()
  const { isOnline } = useOfflineManager()

  // Show install prompt
  useEffect(() => {
    if (isInstallable) {
      showInfo('Install App', 'Add to home screen for a better experience')
    }
  }, [isInstallable, install, showInfo])

  // Request notification permission on first visit
  useEffect(() => {
    const hasRequestedNotifications = localStorage.getItem('notifications-requested')
    if (!hasRequestedNotifications) {
      setTimeout(() => {
        requestNotificationPermission().then(() => {
          localStorage.setItem('notifications-requested', 'true')
        })
      }, 5000)
    }
  }, [requestNotificationPermission])

  return (
    <>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/research" element={<ResearchPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/favorites" element={<FavoritesPage />} />
        </Routes>
      </Layout>
      
      {/* Toast Notifications */}
      <ToastContainer
        toasts={toasts}
        onClose={hideToast}
        position="top-right"
      />
    </>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <WebSocketProvider>
          <AppContent />
        </WebSocketProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}

export default App