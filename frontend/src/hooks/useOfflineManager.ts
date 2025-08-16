import { useState, useEffect, useCallback } from 'react'
import { offlineStorage } from './useOfflineStorage'
import useToast from './useToast'

interface OfflineManagerState {
  isOnline: boolean
  queueSize: number
  cacheSize: number
  lastSync: Date | null
  syncInProgress: boolean
}

interface QueuedAction {
  id: string
  url: string
  method: string
  data: any
  timestamp: number
  retryCount: number
}

const useOfflineManager = () => {
  const { showToast, showSuccess, showError, showOffline, showOnline } = useToast()
  const [state, setState] = useState<OfflineManagerState>({
    isOnline: navigator.onLine,
    queueSize: 0,
    cacheSize: 0,
    lastSync: null,
    syncInProgress: false
  })

  // Monitor online/offline status
  useEffect(() => {
    let offlineToastId: string | null = null

    const handleOnline = async () => {
      setState(prev => ({ ...prev, isOnline: true }))
      showOnline()
      
      // Auto-sync when coming back online
      await syncQueue()
    }

    const handleOffline = () => {
      setState(prev => ({ ...prev, isOnline: false }))
      offlineToastId = showOffline()
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Load initial state
  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const queue = await offlineStorage.getQueue()
      const cacheSize = await offlineStorage.getSize()
      const lastSyncStr = localStorage.getItem('last-sync')
      
      setState(prev => ({
        ...prev,
        queueSize: queue.length,
        cacheSize,
        lastSync: lastSyncStr ? new Date(lastSyncStr) : null
      }))
    } catch (error) {
      console.error('Failed to load offline stats:', error)
    }
  }

  const addToQueue = useCallback(async (
    url: string,
    method: string = 'POST',
    data: any = {}
  ) => {
    try {
      await offlineStorage.addToQueue({ url, method, data })
      setState(prev => ({ ...prev, queueSize: prev.queueSize + 1 }))
      
      showToast({
        type: 'info',
        title: 'Action queued',
        message: 'Will sync when connection is restored'
      })
    } catch (error) {
      showError('Failed to queue action', 'Please try again')
    }
  }, [showToast, showError])

  const syncQueue = useCallback(async () => {
    if (!state.isOnline || state.syncInProgress) return

    setState(prev => ({ ...prev, syncInProgress: true }))

    try {
      const queue = await offlineStorage.getQueue()
      
      if (queue.length === 0) {
        setState(prev => ({ ...prev, syncInProgress: false }))
        return
      }

      let successCount = 0
      let failCount = 0

      for (const item of queue) {
        try {
          const response = await fetch(item.url, {
            method: item.method,
            headers: {
              'Content-Type': 'application/json',
            },
            body: item.method !== 'GET' ? JSON.stringify(item.data) : undefined
          })

          if (response.ok) {
            await offlineStorage.removeFromQueue(item.id)
            successCount++
          } else {
            // Increment retry count
            failCount++
            
            // Remove if too many retries
            if (item.retryCount >= 3) {
              await offlineStorage.removeFromQueue(item.id)
            }
          }
        } catch (error) {
          failCount++
          console.error('Failed to sync item:', item, error)
        }
      }

      // Update stats
      await loadStats()
      
      // Update last sync time
      const now = new Date()
      localStorage.setItem('last-sync', now.toISOString())
      setState(prev => ({ ...prev, lastSync: now, syncInProgress: false }))

      // Show results
      if (successCount > 0) {
        showSuccess(
          'Sync completed',
          `${successCount} items synced${failCount > 0 ? `, ${failCount} failed` : ''}`
        )
      } else if (failCount > 0) {
        showError('Sync failed', 'Some items could not be synced')
      }

    } catch (error) {
      console.error('Sync failed:', error)
      showError('Sync failed', 'Please try again later')
      setState(prev => ({ ...prev, syncInProgress: false }))
    }
  }, [state.isOnline, state.syncInProgress, showSuccess, showError, loadStats])

  const clearCache = useCallback(async () => {
    try {
      await offlineStorage.clear()
      await loadStats()
      showSuccess('Cache cleared', 'All cached data has been removed')
    } catch (error) {
      showError('Failed to clear cache', 'Please try again')
    }
  }, [showSuccess, showError, loadStats])

  const clearQueue = useCallback(async () => {
    try {
      const queue = await offlineStorage.getQueue()
      for (const item of queue) {
        await offlineStorage.removeFromQueue(item.id)
      }
      await loadStats()
      showSuccess('Queue cleared', 'All pending actions have been removed')
    } catch (error) {
      showError('Failed to clear queue', 'Please try again')
    }
  }, [showSuccess, showError, loadStats])

  // Auto-sync when coming online
  useEffect(() => {
    if (state.isOnline && state.queueSize > 0 && !state.syncInProgress) {
      syncQueue()
    }
  }, [state.isOnline, state.queueSize, state.syncInProgress, syncQueue])

  const formatCacheSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getOfflineCapabilities = () => {
    return {
      canViewFavorites: true,
      canViewHistory: true,
      canExportData: true,
      canBrowseCache: true,
      canSearch: false,
      canSync: state.isOnline
    }
  }

  return {
    ...state,
    addToQueue,
    syncQueue,
    clearCache,
    clearQueue,
    formatCacheSize: (bytes: number) => formatCacheSize(bytes),
    capabilities: getOfflineCapabilities(),
    reload: loadStats
  }
}

export default useOfflineManager