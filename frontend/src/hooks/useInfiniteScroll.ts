import { useState, useEffect, useCallback, useRef } from 'react'

interface InfiniteScrollOptions {
  threshold?: number
  rootMargin?: string
  hasMore?: boolean
  loading?: boolean
}

interface InfiniteScrollState<T> {
  items: T[]
  loading: boolean
  hasMore: boolean
  error: string | null
}

interface InfiniteScrollActions {
  loadMore: () => void
  reset: () => void
  setError: (error: string | null) => void
}

const useInfiniteScroll = <T>(
  fetchMore: (page: number) => Promise<{ items: T[]; hasMore: boolean }>,
  options: InfiniteScrollOptions = {}
): InfiniteScrollState<T> & InfiniteScrollActions & { observerRef: React.RefObject<HTMLDivElement> } => {
  const {
    threshold = 1.0,
    rootMargin = '100px',
    hasMore: initialHasMore = true,
    loading: externalLoading = false
  } = options

  const [state, setState] = useState<InfiniteScrollState<T>>({
    items: [],
    loading: false,
    hasMore: initialHasMore,
    error: null
  })

  const [page, setPage] = useState(0)
  const observerRef = useRef<HTMLDivElement>(null)
  const isLoadingRef = useRef(false)

  const loadMore = useCallback(async () => {
    if (isLoadingRef.current || !state.hasMore || externalLoading) {
      return
    }

    isLoadingRef.current = true
    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const nextPage = page + 1
      const result = await fetchMore(nextPage)
      
      setState(prev => ({
        ...prev,
        items: [...prev.items, ...result.items],
        hasMore: result.hasMore,
        loading: false
      }))
      
      setPage(nextPage)
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load more items'
      }))
    } finally {
      isLoadingRef.current = false
    }
  }, [fetchMore, page, state.hasMore, externalLoading])

  const reset = useCallback(() => {
    setState({
      items: [],
      loading: false,
      hasMore: initialHasMore,
      error: null
    })
    setPage(0)
    isLoadingRef.current = false
  }, [initialHasMore])

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error }))
  }, [])

  // Set up intersection observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (entry.isIntersecting && state.hasMore && !state.loading && !externalLoading) {
          loadMore()
        }
      },
      {
        threshold,
        rootMargin
      }
    )

    const currentObserverRef = observerRef.current
    if (currentObserverRef) {
      observer.observe(currentObserverRef)
    }

    return () => {
      if (currentObserverRef) {
        observer.unobserve(currentObserverRef)
      }
    }
  }, [loadMore, state.hasMore, state.loading, threshold, rootMargin, externalLoading])

  return {
    ...state,
    loadMore,
    reset,
    setError,
    observerRef
  }
}

export default useInfiniteScroll

// Utility hook for simpler infinite scrolling without intersection observer
export const useSimpleInfiniteScroll = <T>(
  initialItems: T[] = [],
  pageSize: number = 20
) => {
  const [allItems, setAllItems] = useState<T[]>(initialItems)
  const [displayedItems, setDisplayedItems] = useState<T[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  useEffect(() => {
    const endIndex = currentPage * pageSize
    const newDisplayedItems = allItems.slice(0, endIndex)
    setDisplayedItems(newDisplayedItems)
    setHasMore(endIndex < allItems.length)
  }, [allItems, currentPage, pageSize])

  const loadMore = useCallback(() => {
    if (hasMore) {
      setCurrentPage(prev => prev + 1)
    }
  }, [hasMore])

  const reset = useCallback(() => {
    setCurrentPage(1)
    setDisplayedItems([])
  }, [])

  const updateItems = useCallback((newItems: T[]) => {
    setAllItems(newItems)
    setCurrentPage(1)
  }, [])

  return {
    items: displayedItems,
    hasMore,
    loadMore,
    reset,
    updateItems,
    totalItems: allItems.length,
    displayedCount: displayedItems.length
  }
}