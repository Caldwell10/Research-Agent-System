import React, { useState, useMemo } from 'react'
import { 
  Heart, 
  Folder, 
  Star, 
  Search, 
  Filter, 
  Download, 
  Trash2, 
  Plus,
  MoreVertical,
  X,
  Edit3,
  Move,
  Tag,
  Calendar,
  ExternalLink,
  Share2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { FavoritePaper, Collection } from '@/types/research'
import useFavorites from '@/hooks/useFavorites'
import useAdvancedExport from '@/hooks/useAdvancedExport'
import { format } from 'date-fns'

interface FavoritesPanelProps {
  className?: string
}

const FavoritesPanel: React.FC<FavoritesPanelProps> = ({ className }) => {
  const {
    favorites,
    collections,
    loading,
    addToFavorites,
    removeFromFavorites,
    updatePaperCollections,
    addPaperTags,
    updatePaperNotes,
    updatePaperRating,
    createCollection,
    updateCollection,
    deleteCollection,
    getCollectionPapers,
    getFilteredPapers,
    bulkUpdatePapers,
    bulkDeletePapers,
    getStatistics,
  } = useFavorites()

  const { exportData } = useAdvancedExport()

  const [activeTab, setActiveTab] = useState<'papers' | 'collections'>('papers')
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPapers, setSelectedPapers] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [editingPaper, setEditingPaper] = useState<string | null>(null)
  const [newCollectionName, setNewCollectionName] = useState('')
  const [showNewCollection, setShowNewCollection] = useState(false)

  // Filter papers
  const filteredPapers = useMemo(() => {
    const filters: any = {}
    
    if (searchQuery) filters.query = searchQuery
    if (selectedCollection) filters.collections = [selectedCollection]

    return getFilteredPapers(filters)
  }, [searchQuery, selectedCollection, getFilteredPapers])

  const statistics = getStatistics()

  const handleSelectAll = () => {
    if (selectedPapers.length === filteredPapers.length) {
      setSelectedPapers([])
    } else {
      setSelectedPapers(filteredPapers.map(p => p.id))
    }
  }

  const handleSelectPaper = (id: string) => {
    setSelectedPapers(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    )
  }

  const handleBulkDelete = () => {
    if (selectedPapers.length > 0) {
      bulkDeletePapers(selectedPapers)
      setSelectedPapers([])
    }
  }

  const handleBulkExport = async (format: 'pdf' | 'csv' | 'bibtex' | 'json') => {
    const papersToExport = favorites.filter(p => selectedPapers.includes(p.id))
    await exportData(papersToExport, { format })
  }

  const handleCreateCollection = () => {
    if (newCollectionName.trim()) {
      createCollection(newCollectionName.trim())
      setNewCollectionName('')
      setShowNewCollection(false)
    }
  }

  const handleRating = (paperId: string, rating: number) => {
    updatePaperRating(paperId, rating)
  }

  const renderStars = (rating: number = 0, paperId?: string) => {
    return [...Array(5)].map((_, i) => (
      <button
        key={i}
        onClick={() => paperId && handleRating(paperId, i + 1)}
        className={cn(
          "w-4 h-4 transition-colors",
          paperId ? "hover:text-yellow-500 cursor-pointer" : "cursor-default",
          i < rating ? "text-yellow-500 fill-current" : "text-gray-300"
        )}
      >
        <Star className="w-full h-full" />
      </button>
    ))
  }

  if (loading) {
    return (
      <div className={cn("bg-card rounded-lg border border-border p-6", className)}>
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("bg-card/50 backdrop-blur-sm rounded-xl border border-border", className)}>
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <Heart className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Favorites</h2>
              <p className="text-sm text-muted-foreground">
                {statistics.totalPapers} papers • {statistics.totalCollections} collections
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "p-2 rounded-lg transition-colors",
                showFilters 
                  ? "bg-primary text-primary-foreground" 
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <Filter className="w-4 h-4" />
            </button>

            {selectedPapers.length > 0 && (
              <div className="relative group">
                <button className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                  <MoreVertical className="w-4 h-4" />
                </button>
                
                <div className="absolute right-0 top-full mt-2 w-48 bg-popover border border-border rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none group-hover:pointer-events-auto z-10">
                  <div className="p-2 space-y-1">
                    <button
                      onClick={() => handleBulkExport('pdf')}
                      className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-foreground hover:bg-accent rounded-md transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      <span>Export as PDF</span>
                    </button>
                    <button
                      onClick={() => handleBulkExport('bibtex')}
                      className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-foreground hover:bg-accent rounded-md transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      <span>Export as BibTeX</span>
                    </button>
                    <button
                      onClick={handleBulkDelete}
                      className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete Selected</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 bg-muted p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('papers')}
            className={cn(
              "flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors",
              activeTab === 'papers'
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Papers ({statistics.totalPapers})
          </button>
          <button
            onClick={() => setActiveTab('collections')}
            className={cn(
              "flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors",
              activeTab === 'collections'
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Collections ({statistics.totalCollections})
          </button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mt-4 space-y-4 animate-slide-up">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Search</label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search papers..."
                    className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Collection</label>
                <select
                  value={selectedCollection || ''}
                  onChange={(e) => setSelectedCollection(e.target.value || null)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">All Collections</option>
                  {collections.map((collection) => (
                    <option key={collection.id} value={collection.id}>
                      {collection.name} ({getCollectionPapers(collection.id).length})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {(searchQuery || selectedCollection) && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {filteredPapers.length} of {statistics.totalPapers} papers
                </span>
                <button
                  onClick={() => {
                    setSearchQuery('')
                    setSelectedCollection(null)
                  }}
                  className="text-sm text-primary hover:text-primary/80 transition-colors"
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'papers' ? (
          <div className="space-y-4">
            {/* Bulk selection */}
            {filteredPapers.length > 0 && (
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectedPapers.length === filteredPapers.length}
                  onChange={handleSelectAll}
                  className="rounded border-border text-primary focus:ring-primary"
                />
                <span className="text-sm text-muted-foreground">
                  {selectedPapers.length > 0 
                    ? `${selectedPapers.length} selected`
                    : 'Select all'
                  }
                </span>
              </div>
            )}

            {/* Papers List */}
            {filteredPapers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Heart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">No favorite papers</h3>
                <p className="text-sm">
                  {favorites.length === 0 
                    ? 'Save papers to see them here'
                    : 'No papers match your current filters'
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredPapers.map((paper) => (
                  <div 
                    key={paper.id}
                    className="group p-4 bg-background/50 rounded-lg border border-border/50 hover:border-border transition-all duration-200"
                  >
                    <div className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        checked={selectedPapers.includes(paper.id)}
                        onChange={() => handleSelectPaper(paper.id)}
                        className="mt-1 rounded border-border text-primary focus:ring-primary"
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="font-medium text-foreground mb-1">
                              {paper.title}
                            </h4>
                            <p className="text-sm text-muted-foreground mb-2">
                              {paper.authors.slice(0, 3).join(', ')}
                              {paper.authors.length > 3 && ` +${paper.authors.length - 3} more`}
                            </p>
                            
                            <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-2">
                              <span className="flex items-center space-x-1">
                                <Calendar className="w-3 h-3" />
                                <span>{format(new Date(paper.published), 'MMM yyyy')}</span>
                              </span>
                              {paper.relevance_score && (
                                <span>Relevance: {paper.relevance_score}/10</span>
                              )}
                            </div>

                            {/* Rating */}
                            <div className="flex items-center space-x-2 mb-2">
                              <span className="text-sm text-muted-foreground">Rating:</span>
                              <div className="flex space-x-1">
                                {renderStars(paper.custom_rating, paper.id)}
                              </div>
                            </div>

                            {/* Collections */}
                            {paper.collections.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-2">
                                {paper.collections.map((collectionId) => {
                                  const collection = collections.find(c => c.id === collectionId)
                                  return collection ? (
                                    <span
                                      key={collectionId}
                                      className="inline-flex items-center space-x-1 px-2 py-1 text-xs rounded-md"
                                      style={{ 
                                        backgroundColor: `${collection.color}20`,
                                        color: collection.color 
                                      }}
                                    >
                                      <Folder className="w-3 h-3" />
                                      <span>{collection.name}</span>
                                    </span>
                                  ) : null
                                })}
                              </div>
                            )}

                            {/* Tags */}
                            {paper.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-2">
                                {paper.tags.map((tag) => (
                                  <span
                                    key={tag}
                                    className="inline-flex items-center space-x-1 px-2 py-1 bg-primary/10 text-primary text-xs rounded-md"
                                  >
                                    <Tag className="w-3 h-3" />
                                    <span>{tag}</span>
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Notes */}
                            {paper.notes && (
                              <div className="p-2 bg-muted/50 rounded text-sm text-foreground mb-2">
                                {paper.notes}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center space-x-2 ml-4">
                            {paper.pdf_url && (
                              <a
                                href={paper.pdf_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 rounded text-muted-foreground hover:text-primary transition-colors"
                                title="View PDF"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            )}

                            <button
                              onClick={() => setEditingPaper(paper.id)}
                              className="p-1 rounded text-muted-foreground hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
                              title="Edit paper"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => removeFromFavorites(paper.id)}
                              className="p-1 rounded text-muted-foreground hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                              title="Remove from favorites"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Collections Tab */
          <div className="space-y-4">
            {/* New Collection */}
            <div className="flex items-center space-x-2">
              {showNewCollection ? (
                <div className="flex-1 flex items-center space-x-2">
                  <input
                    type="text"
                    value={newCollectionName}
                    onChange={(e) => setNewCollectionName(e.target.value)}
                    placeholder="Collection name..."
                    className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                    onKeyPress={(e) => e.key === 'Enter' && handleCreateCollection()}
                  />
                  <button
                    onClick={handleCreateCollection}
                    className="px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm transition-colors"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => setShowNewCollection(false)}
                    className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowNewCollection(true)}
                  className="flex items-center space-x-2 px-3 py-2 bg-accent text-accent-foreground rounded-lg text-sm hover:bg-accent/80 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Collection</span>
                </button>
              )}
            </div>

            {/* Collections Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {collections.map((collection) => {
                const paperCount = getCollectionPapers(collection.id).length
                
                return (
                  <div 
                    key={collection.id}
                    className="group p-4 bg-background/50 rounded-lg border border-border/50 hover:border-border transition-all duration-200 cursor-pointer"
                    onClick={() => {
                      setSelectedCollection(collection.id)
                      setActiveTab('papers')
                    }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: collection.color }}
                        />
                        <h3 className="font-medium text-foreground">{collection.name}</h3>
                      </div>
                      
                      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            // Edit collection logic here
                          }}
                          className="p-1 rounded text-muted-foreground hover:text-primary transition-colors"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteCollection(collection.id)
                          }}
                          className="p-1 rounded text-muted-foreground hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-2">
                      {collection.description || 'No description'}
                    </p>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {paperCount} papers
                      </span>
                      <span className="text-muted-foreground">
                        {format(new Date(collection.created_date), 'MMM yyyy')}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default FavoritesPanel