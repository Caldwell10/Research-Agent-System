import { ResearchResults } from '@/types/api'
import { FavoritePaper, SearchHistoryItem, Collection } from '@/types/research'

// Mock research papers
export const mockPapers = [
  {
    title: "Deep Learning for Computer Vision: A Comprehensive Survey",
    authors: ["John Smith", "Jane Doe", "Alice Johnson"],
    abstract: "This paper presents a comprehensive survey of deep learning techniques applied to computer vision tasks. We review the latest architectures, training methodologies, and applications across various domains including image classification, object detection, and semantic segmentation.",
    published: "2024-01-15",
    arxiv_id: "2401.0123",
    pdf_url: "https://arxiv.org/pdf/2401.0123.pdf",
    evaluation: {
      relevance_score: 9.2,
      methodology_score: 8.8,
      novelty_score: 7.5,
      clarity_score: 9.0,
      significance_score: 8.5
    }
  },
  {
    title: "Transformer Networks for Natural Language Processing: Recent Advances",
    authors: ["Bob Wilson", "Carol Brown", "David Lee", "Eve Martinez"],
    abstract: "We explore recent advances in transformer architectures for natural language processing tasks. This work covers attention mechanisms, positional encodings, and scaling laws that have revolutionized the field.",
    published: "2024-01-10",
    arxiv_id: "2401.0456",
    pdf_url: "https://arxiv.org/pdf/2401.0456.pdf",
    evaluation: {
      relevance_score: 8.7,
      methodology_score: 9.1,
      novelty_score: 8.2,
      clarity_score: 8.8,
      significance_score: 9.3
    }
  },
  {
    title: "Quantum Machine Learning: Bridging Quantum Computing and AI",
    authors: ["Frank Chen", "Grace Kim", "Henry Zhang"],
    abstract: "This paper investigates the intersection of quantum computing and machine learning, exploring quantum algorithms for optimization, pattern recognition, and data analysis.",
    published: "2024-01-08",
    arxiv_id: "2401.0789",
    pdf_url: "https://arxiv.org/pdf/2401.0789.pdf",
    evaluation: {
      relevance_score: 7.8,
      methodology_score: 8.2,
      novelty_score: 9.1,
      clarity_score: 7.9,
      significance_score: 8.7
    }
  },
  {
    title: "Federated Learning in Healthcare: Privacy-Preserving Medical AI",
    authors: ["Ivy Liu", "Jack Thompson"],
    abstract: "We present a framework for federated learning in healthcare applications, enabling collaborative model training while preserving patient privacy and complying with regulatory requirements.",
    published: "2024-01-05",
    arxiv_id: "2401.1012",
    pdf_url: "https://arxiv.org/pdf/2401.1012.pdf",
    evaluation: {
      relevance_score: 8.9,
      methodology_score: 8.6,
      novelty_score: 8.8,
      clarity_score: 9.2,
      significance_score: 9.5
    }
  },
  {
    title: "Explainable AI for Financial Risk Assessment",
    authors: ["Kevin Wang", "Lisa Garcia", "Mike Rodriguez", "Nina Patel"],
    abstract: "This study develops explainable AI methods for financial risk assessment, providing interpretable predictions for loan default, market volatility, and fraud detection.",
    published: "2024-01-03",
    arxiv_id: "2401.1345",
    pdf_url: "https://arxiv.org/pdf/2401.1345.pdf",
    evaluation: {
      relevance_score: 8.4,
      methodology_score: 8.9,
      novelty_score: 7.6,
      clarity_score: 8.7,
      significance_score: 8.8
    }
  }
]

// Mock successful research results
export const mockSuccessfulResults: ResearchResults = {
  status: "success",
  query: "machine learning for healthcare",
  execution_time_seconds: 125.6,
  research_results: {
    papers: mockPapers,
    total_papers_found: 5,
    search_strategy: "arxiv_search",
    filters_applied: {
      date_range: "2024-01-01 to 2024-01-31",
      subject_categories: ["cs.LG", "cs.AI"],
      min_citations: 0
    }
  },
  analysis_results: {
    key_themes: [
      "Deep learning applications",
      "Privacy-preserving techniques",
      "Explainable AI methods",
      "Healthcare applications",
      "Federated learning"
    ],
    methodology_analysis: {
      common_approaches: ["Transformer architectures", "Federated learning", "Attention mechanisms"],
      evaluation_metrics: ["Accuracy", "Privacy preservation", "Interpretability"],
      datasets_used: ["Medical records", "Financial data", "Image datasets"]
    },
    trend_analysis: {
      emerging_topics: ["Quantum ML", "Federated learning", "Explainable AI"],
      declining_topics: ["Traditional statistical methods"],
      stable_topics: ["Deep learning", "Computer vision"]
    }
  },
  report: {
    executive_summary: "This research analysis examined 5 papers on machine learning for healthcare, revealing strong trends toward privacy-preserving techniques and explainable AI methods. The field shows rapid adoption of transformer architectures and federated learning approaches.",
    key_findings: [
      "Strong emphasis on privacy-preserving machine learning techniques",
      "Growing adoption of transformer architectures in healthcare AI",
      "Increased focus on explainable AI for regulatory compliance",
      "Federated learning gaining traction for multi-institutional collaboration"
    ],
    recommendations: [
      "Prioritize privacy-preserving techniques in healthcare AI development",
      "Invest in explainable AI methods for regulatory compliance",
      "Consider federated learning for multi-institutional projects",
      "Explore quantum machine learning for future applications"
    ],
    methodology_assessment: {
      strengths: [
        "Comprehensive literature coverage",
        "Rigorous evaluation metrics",
        "Strong privacy considerations"
      ],
      limitations: [
        "Limited real-world deployment data",
        "Regulatory compliance variations",
        "Scalability concerns"
      ]
    }
  },
  summary: {
    papers_found: 5,
    key_insights: 4,
    recommendations: 4,
    report_saved_to: "/reports/healthcare_ml_2024.txt"
  }
}

// Mock error results
export const mockErrorResults: ResearchResults = {
  status: "error",
  query: "invalid query with special chars !@#$%",
  execution_time_seconds: 5.2,
  error_message: "Invalid query format. Please use alphanumeric characters and common punctuation only.",
  error_code: "INVALID_QUERY_FORMAT"
}

// Mock failed research results
export const mockFailedResults: ResearchResults = {
  status: "failed_research",
  query: "extremely niche topic with no results",
  execution_time_seconds: 45.3,
  research_results: {
    papers: [],
    total_papers_found: 0,
    search_strategy: "arxiv_search",
    filters_applied: {
      date_range: "2024-01-01 to 2024-01-31",
      subject_categories: ["cs.LG"],
      min_citations: 0
    }
  },
  error_message: "No papers found matching the search criteria. Try broadening your search terms or adjusting date ranges."
}

// Mock WebSocket events
export const mockWebSocketEvents = {
  progressUpdate: {
    type: 'progress_update',
    data: {
      stage: 'research',
      progress: 45,
      message: 'Searching and filtering papers...',
      details: {
        papers_found: 12,
        papers_filtered: 8,
        current_task: 'Evaluating paper relevance'
      }
    }
  },
  stageComplete: {
    type: 'stage_complete',
    data: {
      stage: 'research',
      completed_at: '2024-01-15T10:30:00Z',
      papers_found: 5,
      next_stage: 'analysis'
    }
  },
  analysisProgress: {
    type: 'progress_update',
    data: {
      stage: 'analysis',
      progress: 75,
      message: 'Analyzing papers and extracting insights...',
      details: {
        papers_analyzed: 3,
        total_papers: 5,
        current_task: 'Identifying key themes'
      }
    }
  },
  reportProgress: {
    type: 'progress_update',
    data: {
      stage: 'reporting',
      progress: 90,
      message: 'Generating final report...',
      details: {
        sections_completed: 4,
        total_sections: 5,
        current_task: 'Writing recommendations'
      }
    }
  },
  complete: {
    type: 'research_complete',
    data: {
      status: 'success',
      execution_time: 125.6,
      summary: {
        papers_found: 5,
        key_insights: 4,
        recommendations: 4
      }
    }
  },
  error: {
    type: 'research_error',
    data: {
      stage: 'research',
      error_message: 'Network timeout while fetching papers',
      error_code: 'NETWORK_TIMEOUT'
    }
  }
}

// Mock favorite papers
export const mockFavorites: FavoritePaper[] = [
  {
    id: "fav_1",
    paper_id: "2401.0123",
    title: "Deep Learning for Computer Vision: A Comprehensive Survey",
    authors: ["John Smith", "Jane Doe", "Alice Johnson"],
    abstract: "This paper presents a comprehensive survey of deep learning techniques applied to computer vision tasks...",
    published: "2024-01-15",
    arxiv_id: "2401.0123",
    pdf_url: "https://arxiv.org/pdf/2401.0123.pdf",
    relevance_score: 9.2,
    added_date: "2024-01-16T09:00:00Z",
    collections: ["to-read", "computer-vision"],
    tags: ["deep learning", "computer vision", "survey"],
    custom_rating: 5,
    notes: "Excellent comprehensive overview. Must read for CV research."
  },
  {
    id: "fav_2",
    paper_id: "2401.1012",
    title: "Federated Learning in Healthcare: Privacy-Preserving Medical AI",
    authors: ["Ivy Liu", "Jack Thompson"],
    abstract: "We present a framework for federated learning in healthcare applications...",
    published: "2024-01-05",
    arxiv_id: "2401.1012",
    pdf_url: "https://arxiv.org/pdf/2401.1012.pdf",
    relevance_score: 8.9,
    added_date: "2024-01-16T10:30:00Z",
    collections: ["to-read", "healthcare"],
    tags: ["federated learning", "healthcare", "privacy"],
    custom_rating: 4,
    notes: "Important for privacy-preserving ML in healthcare."
  }
]

// Mock collections
export const mockCollections: Collection[] = [
  {
    id: "to-read",
    name: "To Read",
    description: "Papers I want to read",
    color: "#3B82F6",
    created_date: "2024-01-01T00:00:00Z",
    paper_count: 5,
    is_public: false
  },
  {
    id: "computer-vision",
    name: "Computer Vision",
    description: "Papers related to computer vision research",
    color: "#10B981",
    created_date: "2024-01-05T00:00:00Z",
    paper_count: 3,
    is_public: false
  },
  {
    id: "healthcare",
    name: "Healthcare AI",
    description: "Machine learning applications in healthcare",
    color: "#F59E0B",
    created_date: "2024-01-10T00:00:00Z",
    paper_count: 2,
    is_public: false
  }
]

// Mock search history
export const mockSearchHistory: SearchHistoryItem[] = [
  {
    id: "search_1",
    query: "machine learning for healthcare",
    timestamp: "2024-01-16T09:00:00Z",
    results: {
      papers_found: 5,
      execution_time: 125.6,
      status: "success"
    },
    parameters: {
      max_papers: 5,
      save_report: true
    },
    starred: true,
    tags: ["healthcare", "ml"],
    notes: "Great results, found several relevant papers"
  },
  {
    id: "search_2",
    query: "transformer networks nlp",
    timestamp: "2024-01-15T14:30:00Z",
    results: {
      papers_found: 8,
      execution_time: 89.3,
      status: "success"
    },
    parameters: {
      max_papers: 10,
      save_report: true
    },
    starred: false,
    tags: ["nlp", "transformers"]
  },
  {
    id: "search_3",
    query: "quantum computing",
    timestamp: "2024-01-15T10:15:00Z",
    results: {
      papers_found: 0,
      execution_time: 45.2,
      status: "failed"
    },
    parameters: {
      max_papers: 5,
      save_report: false
    },
    starred: false,
    tags: ["quantum"]
  }
]

// Mock API health response
export const mockHealthResponse = {
  status: "healthy",
  version: "1.0.0",
  timestamp: "2024-01-16T12:00:00Z",
  services: {
    database: "healthy",
    arxiv_api: "healthy",
    websocket: "healthy"
  }
}

// Mock loading states
export const mockLoadingStates = {
  initial: {
    stage: null,
    progress: 0,
    message: "",
    isActive: false
  },
  research: {
    stage: "research",
    progress: 30,
    message: "Searching for relevant papers...",
    isActive: true
  },
  analysis: {
    stage: "analysis",
    progress: 60,
    message: "Analyzing paper content and extracting insights...",
    isActive: true
  },
  reporting: {
    stage: "reporting",
    progress: 90,
    message: "Generating comprehensive report...",
    isActive: true
  },
  complete: {
    stage: "complete",
    progress: 100,
    message: "Research analysis completed successfully!",
    isActive: false
  }
}

// Export functions for dynamic data generation
export const generateMockPaper = (overrides = {}) => ({
  title: `Mock Paper ${Math.random().toString(36).substring(7)}`,
  authors: ["Author One", "Author Two"],
  abstract: "This is a mock abstract for testing purposes.",
  published: "2024-01-15",
  arxiv_id: `2401.${Math.random().toString().substring(2, 6)}`,
  pdf_url: `https://arxiv.org/pdf/2401.${Math.random().toString().substring(2, 6)}.pdf`,
  evaluation: {
    relevance_score: Math.floor(Math.random() * 10) + 1,
    methodology_score: Math.floor(Math.random() * 10) + 1,
    novelty_score: Math.floor(Math.random() * 10) + 1,
    clarity_score: Math.floor(Math.random() * 10) + 1,
    significance_score: Math.floor(Math.random() * 10) + 1
  },
  ...overrides
})

export const generateMockResults = (paperCount = 5, status = "success") => ({
  status,
  query: "test query",
  execution_time_seconds: Math.random() * 200 + 50,
  research_results: {
    papers: Array.from({ length: paperCount }, (_, i) => generateMockPaper({ 
      title: `Test Paper ${i + 1}` 
    })),
    total_papers_found: paperCount,
    search_strategy: "arxiv_search"
  },
  summary: {
    papers_found: paperCount,
    key_insights: 3,
    recommendations: 4
  }
})