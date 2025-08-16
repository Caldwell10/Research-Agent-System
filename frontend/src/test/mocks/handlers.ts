import { http, HttpResponse } from 'msw'
import {
  mockSuccessfulResults,
  mockErrorResults,
  mockFailedResults,
  mockHealthResponse,
  generateMockResults
} from './data'

const BASE_URL = 'http://localhost:8000'

export const handlers = [
  // Health check endpoint
  http.get(`${BASE_URL}/api/health`, () => {
    return HttpResponse.json(mockHealthResponse)
  }),

  // Research endpoint - successful response
  http.post(`${BASE_URL}/api/research`, async ({ request }) => {
    const body = await request.json()
    const { query, max_papers } = body

    // Simulate different responses based on query
    if (query.includes('error')) {
      return HttpResponse.json(mockErrorResults, { status: 400 })
    }

    if (query.includes('no results')) {
      return HttpResponse.json(mockFailedResults)
    }

    if (query.includes('timeout')) {
      return HttpResponse.json({
        status: 'error',
        error_message: 'Request timeout',
        error_code: 'TIMEOUT'
      }, { status: 408 })
    }

    if (query.includes('server error')) {
      return HttpResponse.json({
        status: 'error',
        error_message: 'Internal server error',
        error_code: 'INTERNAL_ERROR'
      }, { status: 500 })
    }

    // Default successful response
    const results = max_papers <= 3 
      ? generateMockResults(max_papers)
      : mockSuccessfulResults

    return HttpResponse.json(results)
  }),

  // WebSocket connection (simulated with REST for testing)
  http.get(`${BASE_URL}/socket.io/`, () => {
    return new HttpResponse('WebSocket connection established')
  }),

  // Export endpoints
  http.post(`${BASE_URL}/api/export/pdf`, () => {
    return HttpResponse.json({ 
      success: true, 
      download_url: '/downloads/research-report.pdf' 
    })
  }),

  http.post(`${BASE_URL}/api/export/csv`, () => {
    return HttpResponse.json({ 
      success: true, 
      download_url: '/downloads/research-data.csv' 
    })
  }),

  http.post(`${BASE_URL}/api/export/bibtex`, () => {
    return HttpResponse.json({ 
      success: true, 
      download_url: '/downloads/research-bibliography.bib' 
    })
  }),

  // Favorites endpoints (for testing server sync)
  http.get(`${BASE_URL}/api/favorites`, () => {
    return HttpResponse.json({ favorites: [], collections: [] })
  }),

  http.post(`${BASE_URL}/api/favorites`, () => {
    return HttpResponse.json({ success: true, id: 'new-favorite-id' }, { status: 201 })
  }),

  // Search history endpoints
  http.get(`${BASE_URL}/api/history`, () => {
    return HttpResponse.json({ history: [] })
  }),

  // Network error simulation
  http.post(`${BASE_URL}/api/research/network-error`, () => {
    return HttpResponse.error()
  }),

  // Slow response simulation
  http.post(`${BASE_URL}/api/research/slow`, async () => {
    await new Promise(resolve => setTimeout(resolve, 1000)) // 1 second delay for testing
    return HttpResponse.json(mockSuccessfulResults)
  }),

  // Rate limiting simulation
  http.post(`${BASE_URL}/api/research/rate-limited`, () => {
    return HttpResponse.json({
      status: 'error',
      error_message: 'Rate limit exceeded. Please try again later.',
      error_code: 'RATE_LIMITED',
      retry_after: 60
    }, { status: 429 })
  })
]

// Error handlers for different scenarios
export const errorHandlers = {
  networkError: http.post(`${BASE_URL}/api/research`, () => {
    return HttpResponse.error()
  }),

  serverError: http.post(`${BASE_URL}/api/research`, () => {
    return HttpResponse.json({
      status: 'error',
      error_message: 'Internal server error',
      error_code: 'INTERNAL_ERROR'
    }, { status: 500 })
  }),

  timeout: http.post(`${BASE_URL}/api/research`, () => {
    return HttpResponse.json({
      status: 'error',
      error_message: 'Request timeout',
      error_code: 'TIMEOUT'
    }, { status: 408 })
  }),

  unauthorized: http.post(`${BASE_URL}/api/research`, () => {
    return HttpResponse.json({
      status: 'error',
      error_message: 'Unauthorized access',
      error_code: 'UNAUTHORIZED'
    }, { status: 401 })
  })
}