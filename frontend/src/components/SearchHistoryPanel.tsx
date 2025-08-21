import React, { useState, useMemo } from 'react'
import { 
  History, 
  Star, 
  Search, 
  Filter, 
  Download, 
  Trash2, 
  Play, 
  Calendar,
  Tag,
  MoreVertical,
  X,
  FileText,
  Clock,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Users
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { SearchHistoryItem } from '@/types/research'
import useSearchHistory from '@/hooks/useSearchHistory'
import { format } from 'date-fns'

interface SearchHistoryPanelProps {
  onRunSearch?: (query: string, maxPapers: number) => void
  className?: string
}

const SearchHistoryPanel: React.FC<SearchHistoryPanelProps> = ({
  onRunSearch,
  className
}) => {
  const {
    searchHistory,
    loading,
    toggleStarred,
    addTags,
    updateNotes,
    deleteSearch,
    deleteSearches,
    clearHistory,
    getFilteredSearches,
    getStatistics,
    exportHistory,
  } = useSearchHistory()

  const [searchQuery, setSearchQuery] = useState('')
  const [filterStarred, setFilterStarred] = useState<boolean | undefined>(undefined)
  const [filterStatus, setFilterStatus] = useState<'all' | 'success' | 'failed' | 'error'>('all')
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [editingNotes, setEditingNotes] = useState<string | null>(null)
  const [newNotes, setNewNotes] = useState('')
  const [expandedSearches, setExpandedSearches] = useState<string[]>([])

  // Filter searches
  const filteredSearches = useMemo(() => {
    const filters: any = {}
    
    if (searchQuery) filters.query = searchQuery
    if (filterStarred !== undefined) filters.starred = filterStarred
    if (filterStatus !== 'all') filters.status = filterStatus

    return getFilteredSearches(filters)
  }, [searchQuery, filterStarred, filterStatus, getFilteredSearches])

  const statistics = getStatistics()

  const handleSelectAll = () => {
    if (selectedItems.length === filteredSearches.length) {
      setSelectedItems([])
    } else {
      setSelectedItems(filteredSearches.map(s => s.id))
    }
  }

  const handleSelectItem = (id: string) => {
    setSelectedItems(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    )
  }

  const handleBulkDelete = () => {
    if (selectedItems.length > 0) {
      deleteSearches(selectedItems)
      setSelectedItems([])
    }
  }

  const handleBulkStar = () => {
    selectedItems.forEach(id => {
      const search = searchHistory.find(s => s.id === id)
      if (search && !search.starred) {
        toggleStarred(id)
      }
    })
    setSelectedItems([])
  }

  const handleSaveNotes = (searchId: string) => {
    updateNotes(searchId, newNotes)
    setEditingNotes(null)
    setNewNotes('')
  }

  const toggleSearchExpanded = (searchId: string) => {
    setExpandedSearches(prev => 
      prev.includes(searchId)
        ? prev.filter(id => id !== searchId)
        : [...prev, searchId]
    )
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400'
      case 'failed': return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 dark:text-yellow-400'  
      case 'error': return 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400'
      default: return 'text-gray-600 bg-gray-50 dark:bg-gray-900/20 dark:text-gray-400'
    }
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
            <div className="p-2 bg-primary/10 rounded-lg">
              <History className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Search History</h2>
              <p className="text-sm text-muted-foreground">
                {statistics.total} searches • {statistics.starred} starred • {statistics.totalPapers} papers found
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

            {selectedItems.length > 0 && (
              <>
                <button
                  onClick={handleBulkStar}
                  className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  title="Star selected"
                >
                  <Star className="w-4 h-4" />
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="p-2 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  title="Delete selected"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}

            <div className="relative group">
              <button className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                <MoreVertical className="w-4 h-4" />
              </button>
              
              <div className="absolute right-0 top-full mt-2 w-48 bg-popover border border-border rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none group-hover:pointer-events-auto z-10">
                <div className="p-2 space-y-1">
                  <button
                    onClick={() => exportHistory('json')}
                    className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-foreground hover:bg-accent rounded-md transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>Export as JSON</span>
                  </button>
                  <button
                    onClick={() => exportHistory('csv')}
                    className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-foreground hover:bg-accent rounded-md transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>Export as CSV</span>
                  </button>
                  <button
                    onClick={clearHistory}
                    className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Clear All</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="space-y-4 animate-slide-up">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Search</label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter by query..."
                    className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="success">Success</option>
                  <option value="failed">Failed</option>
                  <option value="error">Error</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Starred</label>
                <select
                  value={filterStarred === undefined ? 'all' : filterStarred ? 'starred' : 'unstarred'}
                  onChange={(e) => {
                    const value = e.target.value
                    setFilterStarred(value === 'all' ? undefined : value === 'starred')
                  }}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="all">All</option>
                  <option value="starred">Starred</option>
                  <option value="unstarred">Not Starred</option>
                </select>
              </div>
            </div>

            {(searchQuery || filterStarred !== undefined || filterStatus !== 'all') && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {filteredSearches.length} of {statistics.total} searches
                </span>
                <button
                  onClick={() => {
                    setSearchQuery('')
                    setFilterStarred(undefined)
                    setFilterStatus('all')
                  }}
                  className="text-sm text-primary hover:text-primary/80 transition-colors"
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>
        )}

        {/* Bulk selection */}
        {filteredSearches.length > 0 && (
          <div className="flex items-center space-x-2 mt-4">
            <input
              type="checkbox"
              checked={selectedItems.length === filteredSearches.length}
              onChange={handleSelectAll}
              className="rounded border-border text-primary focus:ring-primary"
            />
            <span className="text-sm text-muted-foreground">
              {selectedItems.length > 0 
                ? `${selectedItems.length} selected`
                : 'Select all'
              }
            </span>
          </div>
        )}
      </div>

      {/* Search List */}
      <div className="max-h-96 overflow-y-auto">
        {filteredSearches.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">No search history</h3>
            <p className="text-sm">
              {searchHistory.length === 0 
                ? 'Your research searches will appear here'
                : 'No searches match your current filters'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-2 p-4">
            {filteredSearches.map((search) => (
              <div 
                key={search.id}
                className="group p-4 bg-background/50 rounded-lg border border-border/50 hover:border-border transition-all duration-200"
              >
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    checked={selectedItems.includes(search.id)}
                    onChange={() => handleSelectItem(search.id)}
                    className="mt-1 rounded border-border text-primary focus:ring-primary"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-foreground group-hover:text-primary transition-colors cursor-pointer">
                          {search.query}
                        </h4>
                        <div className="flex items-center space-x-4 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3" />
                            <span>{format(new Date(search.timestamp), 'MMM d, yyyy')}</span>
                          </span>
                          {search.results && (
                            <>
                              <button
                                onClick={() => toggleSearchExpanded(search.id)}
                                className="flex items-center space-x-1 text-primary hover:text-primary/80 transition-colors"
                                disabled={!search.results.papers || search.results.papers.length === 0}
                              >
                                <FileText className="w-3 h-3" />
                                <span>{search.results.papers_found} papers</span>
                                {search.results.papers && search.results.papers.length > 0 && (
                                  expandedSearches.includes(search.id) ? 
                                    <ChevronDown className="w-3 h-3" /> : 
                                    <ChevronRight className="w-3 h-3" />
                                )}
                              </button>
                              {search.results.execution_time && (
                                <span className="flex items-center space-x-1">
                                  <Clock className="w-3 h-3" />
                                  <span>{search.results.execution_time.toFixed(1)}s</span>
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 ml-4">
                        {search.results && (
                          <span className={cn(
                            "px-2 py-1 rounded-full text-xs font-medium",
                            getStatusColor(search.results.status)
                          )}>
                            {search.results.status}
                          </span>
                        )}

                        <button
                          onClick={() => toggleStarred(search.id)}
                          className={cn(
                            "p-1 rounded transition-colors",
                            search.starred 
                              ? "text-yellow-500 hover:text-yellow-600" 
                              : "text-muted-foreground hover:text-yellow-500"
                          )}
                        >
                          <Star className={cn("w-4 h-4", search.starred && "fill-current")} />
                        </button>

                        {onRunSearch && (
                          <button
                            onClick={() => onRunSearch(search.query, search.parameters.max_papers)}
                            className="p-1 rounded text-muted-foreground hover:text-primary transition-colors"
                            title="Re-run search"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          onClick={() => deleteSearch(search.id)}
                          className="p-1 rounded text-muted-foreground hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                          title="Delete search"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Tags */}
                    {search.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {search.tags.map((tag) => (
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
                    {editingNotes === search.id ? (
                      <div className="mt-2">
                        <textarea
                          value={newNotes}
                          onChange={(e) => setNewNotes(e.target.value)}
                          placeholder="Add notes..."
                          className="w-full p-2 text-sm border border-border rounded bg-background text-foreground resize-none"
                          rows={2}
                        />
                        <div className="flex justify-end space-x-2 mt-2">
                          <button
                            onClick={() => setEditingNotes(null)}
                            className="px-3 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleSaveNotes(search.id)}
                            className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded transition-colors"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : search.notes ? (
                      <div 
                        className="mt-2 p-2 bg-muted/50 rounded text-sm text-foreground cursor-pointer"
                        onClick={() => {
                          setEditingNotes(search.id)
                          setNewNotes(search.notes || '')
                        }}
                      >
                        {search.notes}
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingNotes(search.id)
                          setNewNotes('')
                        }}
                        className="mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover:opacity-100"
                      >
                        Add notes...
                      </button>
                    )}

                    {/* Papers Display */}
                    {expandedSearches.includes(search.id) && search.results?.papers && search.results.papers.length > 0 && (
                      <div className="mt-4 border-t border-border pt-4">
                        <h5 className="text-sm font-medium text-foreground mb-3 flex items-center space-x-2">
                          <Users className="w-4 h-4" />
                          <span>Papers Found ({search.results.papers.length})</span>
                        </h5>
                        <div className="space-y-3">
                          {search.results.papers.map((paper, index) => (
                            <div key={index} className="p-3 bg-muted/30 rounded-lg border border-border/30">
                              <div className="flex items-start justify-between mb-2">
                                <h6 className="font-medium text-foreground text-sm leading-tight pr-2">
                                  {paper.title}
                                </h6>
                                <div className="flex items-center space-x-2 flex-shrink-0">
                                  {paper.evaluation?.relevance_score && (
                                    <span className="px-2 py-1 bg-primary/10 text-primary rounded text-xs font-medium">
                                      {paper.evaluation.relevance_score}/10
                                    </span>
                                  )}
                                  {paper.pdf_url && (
                                    <a
                                      href={paper.pdf_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-1 rounded text-muted-foreground hover:text-primary transition-colors"
                                      title="View PDF"
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  )}
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground mb-2">
                                {paper.authors.slice(0, 3).join(', ')}
                                {paper.authors.length > 3 && ` +${paper.authors.length - 3} more`}
                              </p>
                              <p className="text-xs text-muted-foreground mb-2">
                                Published: {paper.published}
                              </p>
                              {paper.abstract && (
                                <p className="text-xs text-foreground line-clamp-2">
                                  {paper.abstract.length > 200 
                                    ? paper.abstract.substring(0, 200) + '...' 
                                    : paper.abstract
                                  }
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default SearchHistoryPanel