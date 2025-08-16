import { useState, useEffect, useCallback } from 'react'
import { SearchHistoryItem, STORAGE_KEYS } from '@/types/research'

const useSearchHistory = () => {
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([])
  const [loading, setLoading] = useState(true)

  // Load search history from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SEARCH_HISTORY)
      if (stored) {
        const parsed = JSON.parse(stored)
        setSearchHistory(parsed)
      }
    } catch (error) {
      console.error('Error loading search history:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // Save to localStorage whenever history changes
  const saveToStorage = useCallback((history: SearchHistoryItem[]) => {
    try {
      localStorage.setItem(STORAGE_KEYS.SEARCH_HISTORY, JSON.stringify(history))
    } catch (error) {
      console.error('Error saving search history:', error)
    }
  }, [])

  // Add new search to history
  const addSearch = useCallback((search: Omit<SearchHistoryItem, 'id' | 'timestamp' | 'starred' | 'tags'>) => {
    const newSearch: SearchHistoryItem = {
      ...search,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      starred: false,
      tags: [],
    }

    setSearchHistory(prev => {
      // Remove duplicate searches (same query and parameters)
      const filtered = prev.filter(item => 
        !(item.query === newSearch.query && 
          item.parameters.max_papers === newSearch.parameters.max_papers)
      )
      
      // Add new search at the beginning and limit to 100 items
      const updated = [newSearch, ...filtered].slice(0, 100)
      saveToStorage(updated)
      return updated
    })

    return newSearch.id
  }, [saveToStorage])

  // Update search results after completion
  const updateSearchResults = useCallback((searchId: string, results: SearchHistoryItem['results']) => {
    setSearchHistory(prev => {
      const updated = prev.map(item =>
        item.id === searchId ? { ...item, results } : item
      )
      saveToStorage(updated)
      return updated
    })
  }, [saveToStorage])

  // Toggle starred status
  const toggleStarred = useCallback((searchId: string) => {
    setSearchHistory(prev => {
      const updated = prev.map(item =>
        item.id === searchId ? { ...item, starred: !item.starred } : item
      )
      saveToStorage(updated)
      return updated
    })
  }, [saveToStorage])

  // Add tags to search
  const addTags = useCallback((searchId: string, tags: string[]) => {
    setSearchHistory(prev => {
      const updated = prev.map(item =>
        item.id === searchId 
          ? { ...item, tags: [...new Set([...item.tags, ...tags])] }
          : item
      )
      saveToStorage(updated)
      return updated
    })
  }, [saveToStorage])

  // Remove tags from search
  const removeTags = useCallback((searchId: string, tags: string[]) => {
    setSearchHistory(prev => {
      const updated = prev.map(item =>
        item.id === searchId 
          ? { ...item, tags: item.tags.filter(tag => !tags.includes(tag)) }
          : item
      )
      saveToStorage(updated)
      return updated
    })
  }, [saveToStorage])

  // Update notes
  const updateNotes = useCallback((searchId: string, notes: string) => {
    setSearchHistory(prev => {
      const updated = prev.map(item =>
        item.id === searchId ? { ...item, notes } : item
      )
      saveToStorage(updated)
      return updated
    })
  }, [saveToStorage])

  // Delete search
  const deleteSearch = useCallback((searchId: string) => {
    setSearchHistory(prev => {
      const updated = prev.filter(item => item.id !== searchId)
      saveToStorage(updated)
      return updated
    })
  }, [saveToStorage])

  // Delete multiple searches
  const deleteSearches = useCallback((searchIds: string[]) => {
    setSearchHistory(prev => {
      const updated = prev.filter(item => !searchIds.includes(item.id))
      saveToStorage(updated)
      return updated
    })
  }, [saveToStorage])

  // Clear all history
  const clearHistory = useCallback(() => {
    setSearchHistory([])
    saveToStorage([])
  }, [saveToStorage])

  // Get filtered searches
  const getFilteredSearches = useCallback((filters: {
    query?: string
    starred?: boolean
    tags?: string[]
    dateRange?: { start: string; end: string }
    status?: 'success' | 'failed' | 'error'
  }) => {
    return searchHistory.filter(search => {
      // Query filter
      if (filters.query && !search.query.toLowerCase().includes(filters.query.toLowerCase())) {
        return false
      }

      // Starred filter
      if (filters.starred !== undefined && search.starred !== filters.starred) {
        return false
      }

      // Tags filter
      if (filters.tags && filters.tags.length > 0) {
        const hasAnyTag = filters.tags.some(tag => search.tags.includes(tag))
        if (!hasAnyTag) return false
      }

      // Date range filter
      if (filters.dateRange) {
        const searchDate = new Date(search.timestamp)
        const startDate = new Date(filters.dateRange.start)
        const endDate = new Date(filters.dateRange.end)
        if (searchDate < startDate || searchDate > endDate) {
          return false
        }
      }

      // Status filter
      if (filters.status && search.results?.status !== filters.status) {
        return false
      }

      return true
    })
  }, [searchHistory])

  // Get search statistics
  const getStatistics = useCallback(() => {
    const total = searchHistory.length
    const starred = searchHistory.filter(s => s.starred).length
    const successful = searchHistory.filter(s => s.results?.status === 'success').length
    const failed = searchHistory.filter(s => s.results?.status === 'failed').length
    const totalPapers = searchHistory.reduce((sum, s) => sum + (s.results?.papers_found || 0), 0)
    const avgExecutionTime = searchHistory.filter(s => s.results?.execution_time).length > 0
      ? searchHistory.reduce((sum, s) => sum + (s.results?.execution_time || 0), 0) / 
        searchHistory.filter(s => s.results?.execution_time).length
      : 0

    const allTags = searchHistory.flatMap(s => s.tags)
    const uniqueTags = [...new Set(allTags)]
    const tagCounts = uniqueTags.map(tag => ({
      tag,
      count: allTags.filter(t => t === tag).length
    })).sort((a, b) => b.count - a.count)

    return {
      total,
      starred,
      successful,
      failed,
      totalPapers,
      avgExecutionTime,
      uniqueTags: uniqueTags.length,
      topTags: tagCounts.slice(0, 10),
    }
  }, [searchHistory])

  // Export search history
  const exportHistory = useCallback((format: 'json' | 'csv') => {
    if (format === 'json') {
      const blob = new Blob([JSON.stringify(searchHistory, null, 2)], { 
        type: 'application/json' 
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `search-history-${new Date().toISOString().split('T')[0]}.json`
      link.click()
      URL.revokeObjectURL(url)
    } else if (format === 'csv') {
      const headers = ['Query', 'Date', 'Papers Found', 'Execution Time', 'Status', 'Starred', 'Tags', 'Notes']
      const rows = searchHistory.map(search => [
        search.query,
        new Date(search.timestamp).toLocaleDateString(),
        search.results?.papers_found || 0,
        search.results?.execution_time || 0,
        search.results?.status || 'pending',
        search.starred ? 'Yes' : 'No',
        search.tags.join('; '),
        search.notes || ''
      ])

      const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `search-history-${new Date().toISOString().split('T')[0]}.csv`
      link.click()
      URL.revokeObjectURL(url)
    }
  }, [searchHistory])

  return {
    searchHistory,
    loading,
    addSearch,
    updateSearchResults,
    toggleStarred,
    addTags,
    removeTags,
    updateNotes,
    deleteSearch,
    deleteSearches,
    clearHistory,
    getFilteredSearches,
    getStatistics,
    exportHistory,
  }
}

export default useSearchHistory