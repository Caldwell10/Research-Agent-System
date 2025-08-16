import { useState, useEffect, useCallback } from 'react'

interface OfflineStorageOptions {
  key: string
  ttl?: number // Time to live in milliseconds
  version?: string
  compress?: boolean
}

interface StoredData<T> {
  data: T
  timestamp: number
  version: string
  ttl?: number
}

interface QueueItem {
  id: string
  url: string
  method: string
  data: any
  timestamp: number
  retryCount: number
}

class OfflineStorage {
  private dbName = 'research-app-offline'
  private version = 1
  private db: IDBDatabase | null = null

  async init(): Promise<void> {
    if (this.db) return

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Cache store
        if (!db.objectStoreNames.contains('cache')) {
          const cacheStore = db.createObjectStore('cache', { keyPath: 'key' })
          cacheStore.createIndex('timestamp', 'timestamp', { unique: false })
        }

        // Queue store for offline actions
        if (!db.objectStoreNames.contains('queue')) {
          const queueStore = db.createObjectStore('queue', { keyPath: 'id' })
          queueStore.createIndex('timestamp', 'timestamp', { unique: false })
        }

        // Research results store
        if (!db.objectStoreNames.contains('results')) {
          const resultsStore = db.createObjectStore('results', { keyPath: 'query' })
          resultsStore.createIndex('timestamp', 'timestamp', { unique: false })
        }
      }
    })
  }

  async set<T>(key: string, data: T, ttl?: number): Promise<void> {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')

    const storedData: StoredData<T> = {
      data,
      timestamp: Date.now(),
      version: '1.0',
      ttl
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache'], 'readwrite')
      const store = transaction.objectStore('cache')
      const request = store.put({ key, ...storedData })

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async get<T>(key: string): Promise<T | null> {
    await this.init()
    if (!this.db) return null

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache'], 'readonly')
      const store = transaction.objectStore('cache')
      const request = store.get(key)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const result = request.result as StoredData<T> & { key: string } | undefined

        if (!result) {
          resolve(null)
          return
        }

        // Check TTL
        if (result.ttl && Date.now() - result.timestamp > result.ttl) {
          // Expired, remove it
          this.remove(key)
          resolve(null)
          return
        }

        resolve(result.data)
      }
    })
  }

  async remove(key: string): Promise<void> {
    await this.init()
    if (!this.db) return

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache'], 'readwrite')
      const store = transaction.objectStore('cache')
      const request = store.delete(key)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async clear(): Promise<void> {
    await this.init()
    if (!this.db) return

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache'], 'readwrite')
      const store = transaction.objectStore('cache')
      const request = store.clear()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async addToQueue(item: Omit<QueueItem, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
    await this.init()
    if (!this.db) return

    const queueItem: QueueItem = {
      ...item,
      id: Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
      retryCount: 0
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['queue'], 'readwrite')
      const store = transaction.objectStore('queue')
      const request = store.add(queueItem)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async getQueue(): Promise<QueueItem[]> {
    await this.init()
    if (!this.db) return []

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['queue'], 'readonly')
      const store = transaction.objectStore('queue')
      const request = store.getAll()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result || [])
    })
  }

  async removeFromQueue(id: string): Promise<void> {
    await this.init()
    if (!this.db) return

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['queue'], 'readwrite')
      const store = transaction.objectStore('queue')
      const request = store.delete(id)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async getSize(): Promise<number> {
    if (!this.db) return 0

    try {
      // This is an approximation as IndexedDB doesn't provide direct size info
      const cacheCount = await this.getCount('cache')
      const queueCount = await this.getCount('queue')
      const resultsCount = await this.getCount('results')
      
      return (cacheCount + queueCount + resultsCount) * 1024 // Rough estimate
    } catch {
      return 0
    }
  }

  private async getCount(storeName: string): Promise<number> {
    if (!this.db) return 0

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly')
      const store = transaction.objectStore(storeName)
      const request = store.count()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
    })
  }
}

const offlineStorage = new OfflineStorage()

const useOfflineStorage = <T>(options: OfflineStorageOptions) => {
  const { key, ttl, version = '1.0' } = options
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const stored = await offlineStorage.get<T>(key)
      setData(stored)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [key])

  const saveData = useCallback(async (newData: T) => {
    try {
      await offlineStorage.set(key, newData, ttl)
      setData(newData)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save data')
      throw err
    }
  }, [key, ttl])

  const removeData = useCallback(async () => {
    try {
      await offlineStorage.remove(key)
      setData(null)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove data')
      throw err
    }
  }, [key])

  useEffect(() => {
    loadData()
  }, [loadData])

  return {
    data,
    loading,
    error,
    saveData,
    removeData,
    reload: loadData
  }
}

export default useOfflineStorage
export { offlineStorage }