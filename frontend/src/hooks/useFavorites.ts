import { useState, useEffect, useCallback } from 'react'
import { FavoritePaper, Collection, STORAGE_KEYS, DEFAULT_COLLECTIONS } from '@/types/research'

const useFavorites = () => {
  const [favorites, setFavorites] = useState<FavoritePaper[]>([])
  const [collections, setCollections] = useState<Collection[]>(DEFAULT_COLLECTIONS)
  const [loading, setLoading] = useState(true)

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const storedFavorites = localStorage.getItem(STORAGE_KEYS.FAVORITES)
      const storedCollections = localStorage.getItem(STORAGE_KEYS.COLLECTIONS)

      if (storedFavorites) {
        setFavorites(JSON.parse(storedFavorites))
      }

      if (storedCollections) {
        setCollections(JSON.parse(storedCollections))
      }
    } catch (error) {
      console.error('Error loading favorites:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // Save to localStorage
  const saveFavorites = useCallback((favs: FavoritePaper[]) => {
    try {
      localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favs))
    } catch (error) {
      console.error('Error saving favorites:', error)
    }
  }, [])

  const saveCollections = useCallback((colls: Collection[]) => {
    try {
      localStorage.setItem(STORAGE_KEYS.COLLECTIONS, JSON.stringify(colls))
    } catch (error) {
      console.error('Error saving collections:', error)
    }
  }, [])

  // Add paper to favorites
  const addToFavorites = useCallback((paper: any, collectionIds: string[] = ['to-read']) => {
    const favoritePaper: FavoritePaper = {
      id: Date.now().toString(),
      paper_id: paper.arxiv_id || paper.title, // Unique identifier
      title: paper.title,
      authors: paper.authors,
      abstract: paper.abstract,
      published: paper.published,
      arxiv_id: paper.arxiv_id,
      pdf_url: paper.pdf_url,
      relevance_score: paper.evaluation?.relevance_score,
      added_date: new Date().toISOString(),
      collections: collectionIds,
      tags: [],
      custom_rating: undefined,
    }

    setFavorites(prev => {
      // Check if paper already exists
      const existing = prev.find(f => f.paper_id === favoritePaper.paper_id)
      
      if (existing) {
        // Update collections if paper exists
        const updated = prev.map(f => 
          f.paper_id === favoritePaper.paper_id 
            ? { ...f, collections: [...new Set([...f.collections, ...collectionIds])] }
            : f
        )
        saveFavorites(updated)
        return updated
      }

      // Add new paper
      const updated = [...prev, favoritePaper]
      saveFavorites(updated)
      return updated
    })

    return favoritePaper.id
  }, [saveFavorites])

  // Remove from favorites
  const removeFromFavorites = useCallback((paperId: string) => {
    setFavorites(prev => {
      const updated = prev.filter(f => f.id !== paperId)
      saveFavorites(updated)
      return updated
    })
  }, [saveFavorites])

  // Check if paper is in favorites
  const isInFavorites = useCallback((paperIdentifier: string) => {
    return favorites.some(f => f.paper_id === paperIdentifier || f.arxiv_id === paperIdentifier)
  }, [favorites])

  // Update paper collections
  const updatePaperCollections = useCallback((paperId: string, collectionIds: string[]) => {
    setFavorites(prev => {
      const updated = prev.map(f =>
        f.id === paperId ? { ...f, collections: collectionIds } : f
      )
      saveFavorites(updated)
      return updated
    })
  }, [saveFavorites])

  // Add tags to paper
  const addPaperTags = useCallback((paperId: string, tags: string[]) => {
    setFavorites(prev => {
      const updated = prev.map(f =>
        f.id === paperId 
          ? { ...f, tags: [...new Set([...f.tags, ...tags])] }
          : f
      )
      saveFavorites(updated)
      return updated
    })
  }, [saveFavorites])

  // Remove tags from paper
  const removePaperTags = useCallback((paperId: string, tags: string[]) => {
    setFavorites(prev => {
      const updated = prev.map(f =>
        f.id === paperId 
          ? { ...f, tags: f.tags.filter(tag => !tags.includes(tag)) }
          : f
      )
      saveFavorites(updated)
      return updated
    })
  }, [saveFavorites])

  // Update paper notes
  const updatePaperNotes = useCallback((paperId: string, notes: string) => {
    setFavorites(prev => {
      const updated = prev.map(f =>
        f.id === paperId ? { ...f, notes } : f
      )
      saveFavorites(updated)
      return updated
    })
  }, [saveFavorites])

  // Update paper rating
  const updatePaperRating = useCallback((paperId: string, rating: number) => {
    setFavorites(prev => {
      const updated = prev.map(f =>
        f.id === paperId ? { ...f, custom_rating: rating } : f
      )
      saveFavorites(updated)
      return updated
    })
  }, [saveFavorites])

  // Create new collection
  const createCollection = useCallback((name: string, description?: string, color?: string) => {
    const newCollection: Collection = {
      id: Date.now().toString(),
      name,
      description,
      color: color || '#3B82F6',
      created_date: new Date().toISOString(),
      paper_count: 0,
      is_public: false,
    }

    setCollections(prev => {
      const updated = [...prev, newCollection]
      saveCollections(updated)
      return updated
    })

    return newCollection.id
  }, [saveCollections])

  // Update collection
  const updateCollection = useCallback((collectionId: string, updates: Partial<Collection>) => {
    setCollections(prev => {
      const updated = prev.map(c =>
        c.id === collectionId ? { ...c, ...updates } : c
      )
      saveCollections(updated)
      return updated
    })
  }, [saveCollections])

  // Delete collection
  const deleteCollection = useCallback((collectionId: string) => {
    // Don't allow deleting default collections
    const defaultIds = DEFAULT_COLLECTIONS.map(c => c.id)
    if (defaultIds.includes(collectionId)) {
      return false
    }

    setCollections(prev => {
      const updated = prev.filter(c => c.id !== collectionId)
      saveCollections(updated)
      return updated
    })

    // Remove collection from all papers
    setFavorites(prev => {
      const updated = prev.map(f => ({
        ...f,
        collections: f.collections.filter(id => id !== collectionId)
      }))
      saveFavorites(updated)
      return updated
    })

    return true
  }, [saveCollections, saveFavorites])

  // Update collection paper counts
  const updateCollectionCounts = useCallback(() => {
    setCollections(prev => {
      const updated = prev.map(collection => ({
        ...collection,
        paper_count: favorites.filter(f => f.collections.includes(collection.id)).length
      }))
      saveCollections(updated)
      return updated
    })
  }, [favorites, saveCollections])

  // Update collection counts whenever favorites change
  useEffect(() => {
    if (!loading) {
      updateCollectionCounts()
    }
  }, [favorites, loading, updateCollectionCounts])

  // Get papers in collection
  const getCollectionPapers = useCallback((collectionId: string) => {
    return favorites.filter(f => f.collections.includes(collectionId))
  }, [favorites])

  // Get filtered papers
  const getFilteredPapers = useCallback((filters: {
    collections?: string[]
    tags?: string[]
    query?: string
    rating?: number
    dateRange?: { start: string; end: string }
  }) => {
    return favorites.filter(paper => {
      // Collection filter
      if (filters.collections && filters.collections.length > 0) {
        const hasAnyCollection = filters.collections.some(id => paper.collections.includes(id))
        if (!hasAnyCollection) return false
      }

      // Tags filter
      if (filters.tags && filters.tags.length > 0) {
        const hasAnyTag = filters.tags.some(tag => paper.tags.includes(tag))
        if (!hasAnyTag) return false
      }

      // Query filter (title, authors, abstract)
      if (filters.query) {
        const query = filters.query.toLowerCase()
        const searchText = [
          paper.title,
          paper.authors.join(' '),
          paper.abstract
        ].join(' ').toLowerCase()
        
        if (!searchText.includes(query)) return false
      }

      // Rating filter
      if (filters.rating && paper.custom_rating !== filters.rating) {
        return false
      }

      // Date range filter
      if (filters.dateRange) {
        const paperDate = new Date(paper.added_date)
        const startDate = new Date(filters.dateRange.start)
        const endDate = new Date(filters.dateRange.end)
        if (paperDate < startDate || paperDate > endDate) {
          return false
        }
      }

      return true
    })
  }, [favorites])

  // Bulk operations
  const bulkUpdatePapers = useCallback((paperIds: string[], updates: Partial<FavoritePaper>) => {
    setFavorites(prev => {
      const updated = prev.map(f =>
        paperIds.includes(f.id) ? { ...f, ...updates } : f
      )
      saveFavorites(updated)
      return updated
    })
  }, [saveFavorites])

  const bulkDeletePapers = useCallback((paperIds: string[]) => {
    setFavorites(prev => {
      const updated = prev.filter(f => !paperIds.includes(f.id))
      saveFavorites(updated)
      return updated
    })
  }, [saveFavorites])

  // Export favorites
  const exportFavorites = useCallback((format: 'json' | 'csv' | 'bibtex', collectionIds?: string[]) => {
    const papersToExport = collectionIds 
      ? favorites.filter(f => f.collections.some(id => collectionIds.includes(id)))
      : favorites

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(papersToExport, null, 2)], { 
        type: 'application/json' 
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `favorites-${new Date().toISOString().split('T')[0]}.json`
      link.click()
      URL.revokeObjectURL(url)
    } else if (format === 'csv') {
      const headers = ['Title', 'Authors', 'Published', 'Collections', 'Tags', 'Rating', 'Notes']
      const rows = papersToExport.map(paper => [
        paper.title,
        paper.authors.join('; '),
        paper.published,
        paper.collections.map(id => collections.find(c => c.id === id)?.name || id).join('; '),
        paper.tags.join('; '),
        paper.custom_rating || '',
        paper.notes || ''
      ])

      const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `favorites-${new Date().toISOString().split('T')[0]}.csv`
      link.click()
      URL.revokeObjectURL(url)
    } else if (format === 'bibtex') {
      const bibtexEntries = papersToExport.map(paper => {
        const authors = paper.authors.join(' and ')
        const year = new Date(paper.published).getFullYear()
        const key = paper.arxiv_id || paper.title.replace(/\s+/g, '').substring(0, 20)
        
        return `@article{${key},
  title={${paper.title}},
  author={${authors}},
  year={${year}},
  journal={arXiv preprint},
  url={${paper.pdf_url || ''}},
  note={${paper.notes || ''}}
}`
      }).join('\n\n')

      const blob = new Blob([bibtexEntries], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `favorites-${new Date().toISOString().split('T')[0]}.bib`
      link.click()
      URL.revokeObjectURL(url)
    }
  }, [favorites, collections])

  // Get statistics
  const getStatistics = useCallback(() => {
    const totalPapers = favorites.length
    const totalCollections = collections.length
    const averageRating = favorites.filter(f => f.custom_rating).length > 0
      ? favorites.reduce((sum, f) => sum + (f.custom_rating || 0), 0) / 
        favorites.filter(f => f.custom_rating).length
      : 0

    const allTags = favorites.flatMap(f => f.tags)
    const uniqueTags = [...new Set(allTags)]
    const tagCounts = uniqueTags.map(tag => ({
      tag,
      count: allTags.filter(t => t === tag).length
    })).sort((a, b) => b.count - a.count)

    const recentPapers = favorites
      .sort((a, b) => new Date(b.added_date).getTime() - new Date(a.added_date).getTime())
      .slice(0, 5)

    return {
      totalPapers,
      totalCollections,
      averageRating,
      uniqueTags: uniqueTags.length,
      topTags: tagCounts.slice(0, 10),
      recentPapers,
      collectionsWithCounts: collections.map(c => ({
        ...c,
        paper_count: favorites.filter(f => f.collections.includes(c.id)).length
      }))
    }
  }, [favorites, collections])

  return {
    favorites,
    collections,
    loading,
    addToFavorites,
    removeFromFavorites,
    isInFavorites,
    updatePaperCollections,
    addPaperTags,
    removePaperTags,
    updatePaperNotes,
    updatePaperRating,
    createCollection,
    updateCollection,
    deleteCollection,
    getCollectionPapers,
    getFilteredPapers,
    bulkUpdatePapers,
    bulkDeletePapers,
    exportFavorites,
    getStatistics,
  }
}

export default useFavorites