import { useCallback, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

interface PrefetchOptions {
  priority?: 'high' | 'low'
  timeout?: number
  retries?: number
}

interface PrefetchItem {
  url: string
  options: PrefetchOptions
  timestamp: number
  retryCount: number
}

class PrefetchManager {
  private cache = new Map<string, Promise<Response>>()
  private queue: PrefetchItem[] = []
  private isProcessing = false
  private maxConcurrent = 3

  async prefetch(url: string, options: PrefetchOptions = {}): Promise<void> {
    const { priority = 'low', timeout = 5000, retries = 1 } = options

    // Skip if already cached or in queue
    if (this.cache.has(url) || this.queue.some(item => item.url === url)) {
      return
    }

    const item: PrefetchItem = {
      url,
      options: { priority, timeout, retries },
      timestamp: Date.now(),
      retryCount: 0
    }

    // Add to queue based on priority
    if (priority === 'high') {
      this.queue.unshift(item)
    } else {
      this.queue.push(item)
    }

    this.processQueue()
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return
    }

    this.isProcessing = true

    const activeFetches: Promise<void>[] = []

    while (this.queue.length > 0 && activeFetches.length < this.maxConcurrent) {
      const item = this.queue.shift()
      if (!item) break

      const fetchPromise = this.fetchItem(item)
      activeFetches.push(fetchPromise)
    }

    await Promise.allSettled(activeFetches)
    this.isProcessing = false

    // Process remaining items
    if (this.queue.length > 0) {
      this.processQueue()
    }
  }

  private async fetchItem(item: PrefetchItem): Promise<void> {
    const { url, options } = item
    const controller = new AbortController()
    
    const timeoutId = setTimeout(() => {
      controller.abort()
    }, options.timeout)

    try {
      const fetchPromise = fetch(url, {
        signal: controller.signal,
        credentials: 'same-origin',
        mode: 'cors',
        cache: 'force-cache'
      })

      this.cache.set(url, fetchPromise)
      await fetchPromise

      console.log(`Prefetched: ${url}`)
    } catch (error) {
      this.cache.delete(url)
      
      // Retry if necessary
      if (item.retryCount < (options.retries || 1)) {
        item.retryCount++
        
        // Add back to queue with delay
        setTimeout(() => {
          this.queue.push(item)
          this.processQueue()
        }, 1000 * Math.pow(2, item.retryCount))
      }
      
      console.warn(`Failed to prefetch ${url}:`, error)
    } finally {
      clearTimeout(timeoutId)
    }
  }

  getCached(url: string): Promise<Response> | undefined {
    return this.cache.get(url)
  }

  clearCache(): void {
    this.cache.clear()
  }

  getQueueSize(): number {
    return this.queue.length
  }

  getCacheSize(): number {
    return this.cache.size
  }
}

const prefetchManager = new PrefetchManager()

const usePrefetch = () => {
  const location = useLocation()
  const lastLocationRef = useRef(location.pathname)

  const prefetch = useCallback((url: string, options?: PrefetchOptions) => {
    // Only prefetch if user is online
    if (!navigator.onLine) return

    return prefetchManager.prefetch(url, options)
  }, [])

  const prefetchRoute = useCallback((route: string, priority: 'high' | 'low' = 'low') => {
    // Convert route to full URL if needed
    const url = route.startsWith('/') ? `${window.location.origin}${route}` : route
    return prefetch(url, { priority })
  }, [prefetch])

  const prefetchLikelyRoutes = useCallback(() => {
    const currentPath = location.pathname

    // Predict likely next routes based on current path
    const likelyRoutes: Array<{ route: string; priority: 'high' | 'low' }> = []

    switch (currentPath) {
      case '/':
        likelyRoutes.push(
          { route: '/research', priority: 'high' },
          { route: '/history', priority: 'low' },
          { route: '/favorites', priority: 'low' }
        )
        break
      
      case '/research':
        likelyRoutes.push(
          { route: '/history', priority: 'high' },
          { route: '/favorites', priority: 'low' }
        )
        break
      
      case '/history':
        likelyRoutes.push(
          { route: '/research', priority: 'high' },
          { route: '/favorites', priority: 'low' }
        )
        break
      
      case '/favorites':
        likelyRoutes.push(
          { route: '/research', priority: 'high' },
          { route: '/history', priority: 'low' }
        )
        break
    }

    // Prefetch likely routes
    likelyRoutes.forEach(({ route, priority }) => {
      prefetchRoute(route, priority)
    })
  }, [location.pathname, prefetchRoute])

  // Auto-prefetch when route changes
  useEffect(() => {
    if (lastLocationRef.current !== location.pathname) {
      lastLocationRef.current = location.pathname
      
      // Small delay to not interfere with current page load
      const timer = setTimeout(prefetchLikelyRoutes, 1000)
      return () => clearTimeout(timer)
    }
  }, [location.pathname, prefetchLikelyRoutes])

  // Prefetch on hover/focus
  const onHover = useCallback((url: string) => {
    prefetch(url, { priority: 'high', timeout: 3000 })
  }, [prefetch])

  const onFocus = useCallback((url: string) => {
    prefetch(url, { priority: 'high', timeout: 3000 })
  }, [prefetch])

  // Get prefetch stats
  const getStats = useCallback(() => {
    return {
      queueSize: prefetchManager.getQueueSize(),
      cacheSize: prefetchManager.getCacheSize()
    }
  }, [])

  // Clear cache
  const clearCache = useCallback(() => {
    prefetchManager.clearCache()
  }, [])

  return {
    prefetch,
    prefetchRoute,
    prefetchLikelyRoutes,
    onHover,
    onFocus,
    getStats,
    clearCache
  }
}

export default usePrefetch
export { prefetchManager }