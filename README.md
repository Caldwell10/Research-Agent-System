# Multi-Agent Research Tool

An AI-powered research assistant that combines three specialized AI agents to provide intelligent research paper analysis and comprehensive insights from academic literature.

## Overview

The Multi-Agent Research Tool is a modern web application featuring a React-based frontend hosted on AWS Amplify and a FastAPI backend deployed on Render. The system orchestrates three specialized AI agents to discover, analyze, and report on academic papers from ArXiv and Semantic Scholar.

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Frontend (AWS Amplify)                    │
├─────────────────────────────────────────────────────────────┤
│ • ResearchPage.tsx (Research Dashboard)                     │
│ • Real-time Progress Updates                                │
│ • Data Visualizations & Export                              │
│ • Mobile-First Responsive Design                            │
└─────────────────────────────────────────────────────────────┘
                                │
                            HTTPS/REST
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                   Backend API (Render)                      │
├─────────────────────────────────────────────────────────────┤
│ • /api/research (Multi-Agent Research Endpoint)             │
│ • /api/health (Service Health Check)                        │
│ • FastAPI with unlimited execution time                     │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                  Three-Agent System                         │
├─────────────────────────────────────────────────────────────┤
│ • ResearcherAgent (Paper Discovery & Filtering)             │
│ • AnalyzerAgent (Content Analysis & Insights)               │  
│ • ReporterAgent (Report Generation & Summary)               │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                  External Services                          │
├─────────────────────────────────────────────────────────────┤
│ • ArXiv API (Academic Paper Search)                         │
│ • Semantic Scholar API (Research Metadata)                  │
│ • Groq LLM (AI Analysis & Generation)                       │
└─────────────────────────────────────────────────────────────┘
```

### Frontend Architecture

The frontend is built using React with TypeScript and follows a component-based architecture:

#### Core Technologies
- **React**: Component-based UI with hooks and context
- **TypeScript**: Type-safe development
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
- **Socket.IO**: Real-time communication
- **Uvicorn**: ASGI server for high-performance async applications
- **Pydantic**: Data validation and serialization

#### Three-Agent System
The system employs three specialized AI agents working in sequence:

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

#### External Integrations
- **ArXiv API**: Academic paper search and retrieval
- **Semantic Scholar API**: Enhanced paper metadata and citations
- **Groq LLM**: High-performance language model for analysis and generation
- **Rate Limiting**: Intelligent API call management and cost optimization

### REST API Endpoints

**Health Check:**
- `GET /api/health` - Backend service health status

**Research Operations:**
- `POST /api/research` - Start multi-agent research process
- `GET /api/` - API information and available endpoints

## System Design Patterns

### 1. **Multi-Agent Architecture**
- **Pattern**: Agent-based distributed system
- **Implementation**: Specialized agents with distinct research responsibilities

### 2. **Progress Tracking Pattern**
- **Pattern**: Embedded progress reporting in HTTP responses
- **Implementation**: Research system includes progress updates in response data

### 3. **Repository Pattern**
- **Pattern**: Data access abstraction
- **Implementation**: API service layer with hooks for data fetching

### 4. **Component Composition**
- **Pattern**: React component composition and render props
- **Implementation**: Reusable UI components with prop interfaces

### 5. **Context Provider Pattern**
- **Pattern**: Dependency injection for React
- **Implementation**: Context providers for WebSocket, theme, and global state

### 6. **Custom Hook Pattern**
- **Pattern**: Logic encapsulation and reuse
- **Implementation**: Custom hooks for research, favorites, progress tracking

### 7. **Command Pattern**
- **Pattern**: Encapsulating requests as objects
- **Implementation**: Research actions and agent commands


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
   Frontend runs on `http://localhost:3000`

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


## Features

### Core Functionality

- **Intelligent Paper Search**: AI-powered relevance scoring and filtering
- **Real-time Progress Tracking**: Live updates during research process
- **Interactive Visualizations**: Charts for relevance scores, publication timelines, and categories
- **Favorites Management**: Save and organize papers with collections
- **Search History**: Track and revisit previous research queries

##  Development

### Available Scripts

**Frontend:**
- `npm run dev` - Development server 
- `npm run build` - Production build
- `npm run preview` - Preview production build
- `npm run lint` - Code linting with ESLint
- `npm run type-check` - TypeScript type checking

**Backend:**
- `python backend_server.py` - Start FastAPI server
- `python main.py "query"` - Direct CLI research

## 🏗️ Deployment

### Production Deployment

**Frontend (AWS Amplify):**
- Connected to GitHub repository for automatic deployments
- Frontend builds and deploys automatically on commits
- Environment variables configured in Amplify console

**Backend (Render):**
- Connected to GitHub repository
- Automatically deploys from `render.yaml` configuration
- Environment variables configured in Render dashboard

### Environment Variables

**Backend (Render):**
```env
GROQ_API_KEY=your_groq_api_key
PORT=10000
```

**Frontend (Amplify):**
```env
VITE_API_URL=https://main.dsyejk39ji1ch.amplifyapp.com/
VITE_WS_URL=https://main.dsyejk39ji1ch.amplifyapp.com/
```

##  Acknowledgments

- **ArXiv**: For providing open access to academic papers
- **Groq**: For high-performance language model API
- **React Community**: For excellent tooling and libraries
- **FastAPI**: For the modern Python web framework

---

