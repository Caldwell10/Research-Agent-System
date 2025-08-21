// Enhanced research management types
export interface SearchHistoryItem {
  id: string
  query: string
  timestamp: string
  results?: {
    papers_found: number
    execution_time: number
    status: 'success' | 'failed' | 'error'
    papers?: Array<{
      title: string
      authors: string[]
      abstract: string
      published: string
      arxiv_id?: string
      pdf_url?: string
      evaluation?: {
        relevance_score: number
        key_contributions: string[]
        limitations: string[]
        importance: string
      }
    }>
  }
  parameters: {
    max_papers: number
    save_report: boolean
  }
  starred: boolean
  tags: string[]
  notes?: string
}

export interface FavoritePaper {
  id: string
  paper_id: string // From original paper data
  title: string
  authors: string[]
  abstract: string
  published: string
  arxiv_id?: string
  pdf_url?: string
  relevance_score?: number
  added_date: string
  collections: string[]
  tags: string[]
  notes?: string
  custom_rating?: number // 1-5 stars
}

export interface Collection {
  id: string
  name: string
  description?: string
  color: string
  created_date: string
  paper_count: number
  is_public: boolean
  share_code?: string
}

export interface ExportFormat {
  type: 'pdf' | 'csv' | 'excel' | 'bibtex' | 'word' | 'json' | 'powerpoint'
  name: string
  description: string
  icon: string
  supported_data: ('papers' | 'search_history' | 'collections')[]
}

export interface ExportOptions {
  format: ExportFormat['type']
  filename?: string
  include_abstracts?: boolean
  include_notes?: boolean
  include_tags?: boolean
  date_range?: {
    start: string
    end: string
  }
  collections?: string[]
  custom_fields?: string[]
}

export interface BulkOperation {
  type: 'export' | 'delete' | 'move' | 'tag' | 'rate'
  target: 'papers' | 'searches' | 'collections'
  items: string[]
  data?: any
}

export interface ShareableCollection {
  collection: Collection
  papers: FavoritePaper[]
  generated_date: string
  expires_date?: string
}

// Local storage keys
export const STORAGE_KEYS = {
  SEARCH_HISTORY: 'research_search_history',
  FAVORITES: 'research_favorites',
  COLLECTIONS: 'research_collections',
  SETTINGS: 'research_settings',
} as const

// Default collections
export const DEFAULT_COLLECTIONS = [
  {
    id: 'to-read',
    name: 'To Read',
    description: 'Papers saved for later reading',
    color: '#3B82F6',
    created_date: new Date().toISOString(),
    paper_count: 0,
    is_public: false,
  },
  {
    id: 'favorites',
    name: 'Favorites',
    description: 'Your most important papers',
    color: '#EF4444',
    created_date: new Date().toISOString(),
    paper_count: 0,
    is_public: false,
  },
  {
    id: 'research-ideas',
    name: 'Research Ideas',
    description: 'Papers that inspire new research directions',
    color: '#10B981',
    created_date: new Date().toISOString(),
    paper_count: 0,
    is_public: false,
  },
] as Collection[]

// Export format definitions
export const EXPORT_FORMATS: ExportFormat[] = [
  {
    type: 'pdf',
    name: 'PDF Report',
    description: 'Formatted research report with papers and analysis',
    icon: 'FileText',
    supported_data: ['papers', 'search_history'],
  },
  {
    type: 'csv',
    name: 'CSV Data',
    description: 'Spreadsheet format for data analysis',
    icon: 'Table',
    supported_data: ['papers', 'search_history', 'collections'],
  },
  {
    type: 'excel',
    name: 'Excel Workbook',
    description: 'Advanced spreadsheet with multiple sheets',
    icon: 'FileSpreadsheet',
    supported_data: ['papers', 'search_history', 'collections'],
  },
  {
    type: 'bibtex',
    name: 'BibTeX Citations',
    description: 'Academic citation format for LaTeX',
    icon: 'Quote',
    supported_data: ['papers'],
  },
  {
    type: 'word',
    name: 'Word Document',
    description: 'Formatted document with references',
    icon: 'FileText',
    supported_data: ['papers', 'collections'],
  },
  {
    type: 'json',
    name: 'JSON Data',
    description: 'Structured data for programmatic access',
    icon: 'Code',
    supported_data: ['papers', 'search_history', 'collections'],
  },
  {
    type: 'powerpoint',
    name: 'PowerPoint Slides',
    description: 'Presentation slides with paper summaries',
    icon: 'Presentation',
    supported_data: ['papers', 'collections'],
  },
]