import React from 'react'
const { useState, useEffect, useCallback } = React

interface PWAState {
  isInstallable: boolean
  isInstalled: boolean
  isOffline: boolean
  swRegistration: ServiceWorkerRegistration | null
  updateAvailable: boolean
}

interface PWAActions {
  install: () => Promise<void>
  requestNotificationPermission: () => Promise<boolean>
  clearCache: () => Promise<void>
  getCacheSize: () => Promise<number>
  showInstallPrompt: () => void
}

const usePWA = (): PWAState & PWAActions => {
  const [state, setState] = useState<PWAState>({
    isInstallable: false,
    isInstalled: false,
    isOffline: typeof navigator !== 'undefined' ? !navigator.onLine : false,
    swRegistration: null,
    updateAvailable: false,
  })

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)

  // Register service worker
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      registerServiceWorker()
    }

    // Check if app is already installed
    if (typeof window !== 'undefined') {
      const isInstalled = window.matchMedia('(display-mode: standalone)').matches ||
                         (window.navigator as any).standalone === true

      setState(prev => ({ ...prev, isInstalled }))
    }
  }, [])

  // Listen for install prompt
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setState(prev => ({ ...prev, isInstallable: true }))
    }

    const handleAppInstalled = () => {
      console.log('PWA was installed')
      setState(prev => ({ ...prev, isInstalled: true, isInstallable: false }))
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  // Listen for online/offline status
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleOnline = () => setState(prev => ({ ...prev, isOffline: false }))
    const handleOffline = () => setState(prev => ({ ...prev, isOffline: true }))

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js')
      
      setState(prev => ({ ...prev, swRegistration: registration }))

      // Check for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setState(prev => ({ ...prev, updateAvailable: true }))
            }
          })
        }
      })

      console.log('Service Worker registered successfully')
    } catch (error) {
      console.error('Service Worker registration failed:', error)
    }
  }

  const install = useCallback(async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt')
      } else {
        console.log('User dismissed the install prompt')
      }
      
      setDeferredPrompt(null)
      setState(prev => ({ ...prev, isInstallable: false }))
    }
  }, [deferredPrompt])

  const requestNotificationPermission = useCallback(async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications')
      return false
    }

    if (Notification.permission === 'granted') {
      return true
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission()
      return permission === 'granted'
    }

    return false
  }, [])

  const clearCache = useCallback(async () => {
    if (state.swRegistration) {
      const messageChannel = new MessageChannel()
      
      return new Promise<void>((resolve) => {
        messageChannel.port1.onmessage = (event) => {
          if (event.data.success) {
            resolve()
          }
        }
        
        state.swRegistration.active?.postMessage(
          { type: 'CLEAR_CACHE' },
          [messageChannel.port2]
        )
      })
    }
  }, [state.swRegistration])

  const getCacheSize = useCallback(async (): Promise<number> => {
    if (state.swRegistration) {
      const messageChannel = new MessageChannel()
      
      return new Promise<number>((resolve) => {
        messageChannel.port1.onmessage = (event) => {
          resolve(event.data.size || 0)
        }
        
        state.swRegistration.active?.postMessage(
          { type: 'GET_CACHE_SIZE' },
          [messageChannel.port2]
        )
      })
    }
    
    return 0
  }, [state.swRegistration])

  const showInstallPrompt = useCallback(() => {
    setState(prev => ({ ...prev, isInstallable: true }))
  }, [])

  return {
    ...state,
    install,
    requestNotificationPermission,
    clearCache,
    getCacheSize,
    showInstallPrompt,
  }
}

export default usePWA