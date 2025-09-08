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
import useToast from '@/hooks/useToast'

function AppContent() {
  const { toasts, hideToast } = useToast()

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