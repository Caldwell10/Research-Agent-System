# Multi-Agent Research Frontend

A modern React TypeScript frontend for the Multi-Agent Research Paper Analysis System.

## Features

- **Modern Stack**: React 18, TypeScript, Tailwind CSS
- **Real-time Updates**: WebSocket integration for live research progress
- **Responsive Design**: Mobile-first approach with dark/light mode
- **API Integration**: Axios with React Query for efficient data management
- **Error Handling**: Comprehensive error boundaries and user feedback
- **Clean Architecture**: Component-based structure with custom hooks

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Backend API running on localhost:8000

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
```

3. Start development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

### Backend Integration

The frontend expects the backend to be running on `localhost:8000` with the following endpoints:

- `POST /api/research` - Start research analysis
- `GET /api/health` - Health check
- `WebSocket /ws` - Real-time updates

## Project Structure

```
src/
├── components/         # Reusable UI components
├── contexts/          # React contexts (Theme, WebSocket)
├── hooks/             # Custom React hooks
├── lib/               # Utilities and API client
├── pages/             # Page components
├── types/             # TypeScript type definitions
├── App.tsx           # Main app component
└── main.tsx          # Application entry point
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript compiler

## Architecture

### State Management
- **React Query** for server state management
- **React Context** for global UI state (theme, WebSocket)
- **useState/useReducer** for local component state

### Styling
- **Tailwind CSS** for utility-first styling
- **CSS Custom Properties** for theme variables
- **Dark/Light Mode** with system preference detection

### API Integration
- **Axios** for HTTP requests with interceptors
- **WebSocket** connection for real-time updates
- **Error handling** with user-friendly messages

### Components
- **Error Boundaries** for error containment
- **Responsive Layout** with navigation
- **Form Handling** with validation
- **Loading States** and progress indicators

## Usage

1. **Home Page**: Overview of system capabilities and status
2. **Research Page**: Submit queries and view real-time analysis
3. **History Page**: Browse previous research analyses

### Research Flow

1. Enter research query (e.g., "deep learning for computer vision")
2. Select maximum papers to analyze (3, 5, or 10)
3. Monitor real-time progress via WebSocket
4. View comprehensive results including:
   - Executive summary
   - Research recommendations  
   - Paper details with relevance scores
   - Download links for full reports

## Environment Variables

```bash
VITE_API_URL=http://localhost:8000  # Backend API URL
VITE_WS_URL=ws://localhost:8000/ws  # WebSocket URL
NODE_ENV=development                # Environment
```

## Contributing

1. Follow the existing code style and patterns
2. Add TypeScript types for all new interfaces
3. Include error handling in components and hooks
4. Test on both desktop and mobile viewports
5. Verify dark/light mode compatibility

## License

This project is part of the Multi-Agent Research Paper Analysis System.