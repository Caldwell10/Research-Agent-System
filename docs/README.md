# Multi-Agent Research Tool

A sophisticated AI-powered research assistant that combines multi-agent systems with RAG (Retrieval-Augmented Generation) technology to provide intelligent research paper analysis, conversational Q&A, and comprehensive insights from academic literature.

## Overview

The Multi-Agent Research Tool is a production-ready SaaS platform that combines multiple specialized AI agents with advanced RAG capabilities. The system features a modern React-based chat interface with real-time WebSocket communication to a FastAPI backend that orchestrates research agents and provides intelligent Q&A through semantic search of academic papers stored in AWS S3.

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React/TS)                  │
├─────────────────────────────────────────────────────────────┤
│ • ChatPage.tsx (RAG Chat Interface)                         │
│ • ResearchPage.tsx (Research Dashboard)                     │  
│ • Layout.tsx (Navigation & Routing)                         │
│ • Real-time WebSocket Connection                            │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                   Backend API (FastAPI)                     │
├─────────────────────────────────────────────────────────────┤
│ • /api/rag/chat (RAG Q&A Endpoint)                          │
│ • /api/research (Multi-Agent Research)                      │
│ • /api/rag/stats (Knowledge Base Stats)                     │
│ • WebSocket Support for Real-time Updates                   │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                    Multi-Agent System                       │
├─────────────────────────────────────────────────────────────┤
│ • ResearcherAgent (Paper Discovery)                         │
│ • AnalyzerAgent (Content Analysis)                          │  
│ • ReporterAgent (Report Generation)                         │
│ • RAGAgent (Q&A Intelligence)                               │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                    RAG Pipeline                             │
├─────────────────────────────────────────────────────────────┤
│ • TextProcessor (Document Chunking)                         │
│ • EmbeddingService (Vector Generation)                      │
│ • S3VectorStore (Cloud Similarity Search)                   │
│ • Knowledge Base Management                                 │  
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                  External Services                          │
├─────────────────────────────────────────────────────────────┤
│ • ArXiv API (Academic Papers)                               │
│ • Semantic Scholar API (Research Metadata)                  │
│ • AWS S3 (Vector Storage)                                   │
│ • Groq LLM (Language Generation)                            │
└─────────────────────────────────────────────────────────────┘
```

### Frontend Architecture

The frontend is built using modern React with TypeScript and follows a component-based architecture:

#### Core Technologies
- **React**: Component-based UI with hooks and context
- **TypeScript**: Type-safe development with enhanced IDE support
- **Vite**: Fast build tool and development server
- **Tailwind CSS**: Utility-first CSS framework for styling
- **React Router**: Client-side routing for SPA navigation

#### State Management
- **React Context**: Global state management for themes, WebSocket, and data
- **React Query**: Server state management and caching
- **Custom Hooks**: Encapsulated logic for complex state operations

#### Real-time Communication
- **Socket.IO Client**: WebSocket connection for real-time progress updates
- **Axios**: HTTP client for REST API communication

#### UI Components & Visualization
- **Chart.js + React ChartJS 2**: Advanced data visualization
- **Lucide React**: Modern icon library
- **Mobile-First Design**: Responsive layout with mobile optimization

### Backend Architecture

The backend is a FastAPI application with WebSocket support and multi-agent orchestration:

#### Core Technologies
- **FastAPI**: Modern, high-performance web framework
- **Socket.IO**: Real-time bidirectional communication
- **Uvicorn**: ASGI server for high-performance async applications
- **Pydantic**: Data validation and serialization

#### Multi-Agent System
The system employs four specialized AI agents:

1. **Researcher Agent** (`researcher.py`)
   - Searches ArXiv and Semantic Scholar for relevant papers
   - Evaluates paper relevance using intelligent scoring
   - Filters and ranks results by topic-specific relevance

2. **Analyzer Agent** (`analyzer.py`)
   - Performs deep content analysis of selected papers
   - Extracts key methodologies and technical details
   - Identifies research trends and patterns

3. **Reporter Agent** (`reporter.py`)
   - Synthesizes findings from multiple papers
   - Generates comprehensive research summaries
   - Creates actionable insights and recommendations

4. **RAG Agent** (`rag_agent.py`)
   - Manages conversational Q&A with academic papers
   - Processes papers into semantic text chunks
   - Provides contextual answers with citations

#### RAG (Retrieval-Augmented Generation) System
- **Text Processing**: Intelligent document chunking with overlap prevention
- **Vector Embeddings**: Semantic similarity using sentence transformers
- **Cloud Storage**: AWS S3-based vector database for scalability
- **Smart Search**: Context-aware retrieval with relevance scoring
- **Conversation Memory**: Multi-turn dialogue support

#### External Integrations
- **ArXiv API**: Academic paper search and retrieval
- **Semantic Scholar API**: Enhanced paper metadata and citations
- **AWS S3**: Cloud vector storage and knowledge base persistence
- **Groq LLM**: High-performance language model for analysis and Q&A
- **Rate Limiting**: Intelligent API call management and cost optimization

## Frontend-Backend Communication

### WebSocket Communication Pattern

The system uses Socket.IO for real-time communication with the following event flow:

```
Frontend                    Backend
    │                         │
    │──── search_request ────►│
    │                         │ ┌─ Agent Research Process
    │◄─── research_started ───│ │
    │◄─── research_progress ──│ │ (Multiple progress updates)
    │◄─── research_complete ──│ └─ Final results
    │                         │
```

#### WebSocket Events

**Client → Server:**
- `search_request`: Initiates research with query parameters

**Server → Client:**
- `research_started`: Confirms research initiation
- `research_progress`: Real-time progress updates from agents
- `research_complete`: Final results with papers and analysis
- `error`: Error notifications

### REST API Endpoints

**Health Check:**
- `GET /health` - Backend service health status

**Research Operations:**
- `POST /research` - Start research process (fallback to HTTP)
- `GET /research/{id}` - Retrieve research results
- `GET /research/history` - Get research history

## System Design Patterns

### 1. **Multi-Agent Architecture**
- **Pattern**: Agent-based distributed system
- **Implementation**: Specialized agents with distinct responsibilities
- **Benefits**: Modular, scalable, and maintainable code structure

### 2. **Observer Pattern (WebSocket Events)**
- **Pattern**: Real-time event-driven communication
- **Implementation**: Socket.IO event handling with progress callbacks
- **Benefits**: Responsive UI with live progress updates

### 3. **Repository Pattern**
- **Pattern**: Data access abstraction
- **Implementation**: API service layer with hooks for data fetching
- **Benefits**: Centralized data management and caching

### 4. **Component Composition**
- **Pattern**: React component composition and render props
- **Implementation**: Reusable UI components with prop interfaces
- **Benefits**: Code reusability and maintainable UI architecture

### 5. **Context Provider Pattern**
- **Pattern**: Dependency injection for React
- **Implementation**: Context providers for WebSocket, theme, and global state
- **Benefits**: Avoid prop drilling and centralized state management

### 6. **Custom Hook Pattern**
- **Pattern**: Logic encapsulation and reuse
- **Implementation**: Custom hooks for research, favorites, progress tracking
- **Benefits**: Separation of concerns and testable business logic

### 7. **Command Pattern**
- **Pattern**: Encapsulating requests as objects
- **Implementation**: Research actions and agent commands
- **Benefits**: Undo/redo functionality and request queuing

## Project Structure

```
Multi-agent Research Tool/
├── frontend/                    # React TypeScript frontend
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   │   ├── charts/        # Data visualization components
│   │   │   └── __tests__/     # Component tests
│   │   ├── contexts/          # React context providers
│   │   ├── hooks/             # Custom React hooks
│   │   ├── pages/             # Route-level components
│   │   ├── lib/               # Utilities and configurations
│   │   ├── types/             # TypeScript type definitions
│   │   └── test/              # Test utilities and mocks
│   ├── public/                # Static assets and PWA files
│   └── package.json           # Frontend dependencies
├── agents/                     # AI agent implementations
│   ├── researcher.py          # Paper search and evaluation
│   ├── analyzer.py            # Content analysis agent
│   └── reporter.py            # Report generation agent
├── tools/                      # External API integrations
│   └── arxiv_tool.py          # ArXiv API wrapper
├── utils/                      # Shared utilities
│   └── groq_llm.py           # LLM client configuration
├── backend_server.py          # FastAPI server with WebSocket
├── enhanced_research_system.py # Multi-agent orchestration
├── main.py                    # Core research system
├── config.py                  # Configuration management
└── requirements_backend.txt   # Python dependencies
```

## Getting Started

### Prerequisites

- **Python 3.8+** with pip
- **Node.js 16+** with npm
- **Groq API Key** for LLM access

### Backend Setup

1. **Create virtual environment:**
   ```bash
   python -m venv research-env
   source research-env/bin/activate 
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements_backend.txt
   ```

3. **Configure environment:**
   ```bash
   cp .env.example .env
   # Add your Groq API key to .env
   echo "GROQ_API_KEY=your_api_key_here" >> .env
   ```

4. **Start the backend server:**
   ```bash
   python backend_server.py
   ```
   Server runs on `http://localhost:8000`

### Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```
   Frontend runs on `http://localhost:3001`

## 🧪 Testing

### Frontend Testing

```bash
cd frontend

# Run all tests
npm run test

# Run tests with coverage
npm run test:coverage

# Run tests with UI
npm run test:ui

# Run E2E tests
npm run test:e2e
```

### Test Coverage

The project includes comprehensive testing:
- **Unit Tests**: Component and hook testing with Vitest
- **Integration Tests**: API and WebSocket integration tests
- **E2E Tests**: End-to-end user flows with Playwright
- **Accessibility Tests**: WCAG compliance testing
- **Mobile Responsive Tests**: Cross-device compatibility

## Features

### Core Functionality

- **Intelligent Paper Search**: AI-powered relevance scoring and filtering
- **Real-time Progress Tracking**: Live updates during research process
- **Interactive Visualizations**: Charts for relevance scores, publication timelines, and categories
- **Export Capabilities**: Multiple format support (JSON, PDF, CSV, BibTeX)
- **Favorites Management**: Save and organize papers with collections
- **Search History**: Track and revisit previous research queries
- **Mobile-First Design**: Responsive interface optimized for all devices

### Advanced Features

- **Progressive Web App (PWA)**: Offline capability and installable app
- **Theme Support**: Dark/light mode with system preference detection
- **Accessibility**: WCAG 2.1 AA compliance with screen reader support
- **Performance Optimization**: Code splitting, lazy loading, and caching
- **Error Boundaries**: Graceful error handling and recovery

##  Development

### Available Scripts

**Frontend:**
- `npm run dev` - Development server with hot reload
- `npm run build` - Production build
- `npm run preview` - Preview production build
- `npm run lint` - Code linting with ESLint
- `npm run type-check` - TypeScript type checking

**Backend:**
- `python backend_server.py` - Start FastAPI server
- `python test_system.py` - Test multi-agent system
- `python main.py "query"` - Direct CLI research

### Code Quality

- **TypeScript**: Strict type checking enabled
- **ESLint**: Code quality and style enforcement
- **Prettier**: Consistent code formatting
- **Husky**: Pre-commit hooks for quality gates

## 🏗️ Deployment

### Production Build

1. **Build frontend:**
   ```bash
   cd frontend
   npm run build
   ```

2. **Configure backend for production:**
   ```bash
   export NODE_ENV=production
   uvicorn backend_server:app --host 0.0.0.0 --port 8000
   ```

### Environment Variables

**Backend (.env):**
```env
GROQ_API_KEY=your_groq_api_key
MAX_PAPERS=10
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=3600
```

**Frontend:**
```env
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

##  Acknowledgments

- **ArXiv**: For providing open access to academic papers
- **Groq**: For high-performance language model API
- **React Community**: For excellent tooling and libraries
- **FastAPI**: For the modern Python web framework

---

