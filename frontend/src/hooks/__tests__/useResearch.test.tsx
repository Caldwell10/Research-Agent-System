import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from 'react-query'
import { server } from '@/test/mocks/server'
import { http, HttpResponse } from 'msw'
import { useResearch, useHealthCheck } from '../useResearch'
import { mockSuccessfulResults, mockErrorResults, mockHealthResponse } from '@/test/mocks/data'

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, cacheTime: 0 },
      mutations: { retry: false }
    }
  })
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('useResearch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('makes successful research request', async () => {
    const wrapper = createWrapper()
    const { result } = renderHook(() => useResearch(), { wrapper })
    
    const onSuccess = vi.fn()
    const onError = vi.fn()
    
    result.current.mutate(
      { query: 'machine learning', max_papers: 5, save_report: true },
      { onSuccess, onError }
    )
    
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
    
    expect(onSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'success',
        query: 'machine learning'
      })
    )
    expect(onError).not.toHaveBeenCalled()
  })

  it('handles API errors correctly', async () => {
    // Mock error response
    server.use(
      http.post('http://localhost:8000/api/research', () => {
        return HttpResponse.json(mockErrorResults, { status: 400 })
      })
    )

    const wrapper = createWrapper()
    const { result } = renderHook(() => useResearch(), { wrapper })
    
    const onSuccess = vi.fn()
    const onError = vi.fn()
    
    result.current.mutate(
      { query: 'error query', max_papers: 5, save_report: true },
      { onSuccess, onError }
    )
    
    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })
    
    expect(onError).toHaveBeenCalled()
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('handles network errors', async () => {
    // Mock network error
    server.use(
      http.post('http://localhost:8000/api/research', () => {
        return HttpResponse.error()
      })
    )

    const wrapper = createWrapper()
    const { result } = renderHook(() => useResearch(), { wrapper })
    
    const onError = vi.fn()
    
    result.current.mutate(
      { query: 'network test', max_papers: 5, save_report: true },
      { onError }
    )
    
    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })
    
    expect(onError).toHaveBeenCalled()
    expect(result.current.error).toBeTruthy()
  })

  it('sends correct request payload', async () => {
    let capturedRequest: any
    
    server.use(
      http.post('http://localhost:8000/api/research', async ({ request }) => {
        capturedRequest = await request.json()
        return HttpResponse.json(mockSuccessfulResults)
      })
    )

    const wrapper = createWrapper()
    const { result } = renderHook(() => useResearch(), { wrapper })
    
    const requestData = {
      query: 'test query',
      max_papers: 10,
      save_report: true
    }
    
    result.current.mutate(requestData)
    
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
    
    expect(capturedRequest).toEqual(requestData)
  })

  it('handles timeout errors', async () => {
    server.use(
      http.post('http://localhost:8000/api/research', () => {
        return HttpResponse.json({
          status: 'error',
          error_message: 'Request timeout',
          error_code: 'TIMEOUT'
        }, { status: 408 })
      })
    )

    const wrapper = createWrapper()
    const { result } = renderHook(() => useResearch(), { wrapper })
    
    result.current.mutate({
      query: 'timeout test',
      max_papers: 5,
      save_report: true
    })
    
    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })
    
    expect(result.current.error).toBeTruthy()
  })

  it('tracks loading state correctly', async () => {
    const wrapper = createWrapper()
    const { result } = renderHook(() => useResearch(), { wrapper })
    
    expect(result.current.isLoading).toBe(false)
    
    result.current.mutate({
      query: 'loading test',
      max_papers: 5,
      save_report: true
    })
    
    expect(result.current.isLoading).toBe(true)
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })
  })
})

describe('useHealthCheck', () => {
  it('fetches health status successfully', async () => {
    const wrapper = createWrapper()
    const { result } = renderHook(() => useHealthCheck(), { wrapper })
    
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
    
    expect(result.current.data).toEqual(mockHealthResponse)
  })

  it('handles health check errors', async () => {
    server.use(
      http.get('http://localhost:8000/api/health', () => {
        return HttpResponse.json({ status: 'unhealthy', error: 'Service unavailable' }, { status: 503 })
      })
    )

    const wrapper = createWrapper()
    const { result } = renderHook(() => useHealthCheck(), { wrapper })
    
    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })
  })

  it('refetches health data automatically', async () => {
    const wrapper = createWrapper()
    const { result } = renderHook(() => useHealthCheck(), { wrapper })
    
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
    
    // Should refetch data
    result.current.refetch()
    
    await waitFor(() => {
      expect(result.current.isFetching).toBe(false)
    })
  })

  it('caches health data appropriately', async () => {
    const fetchSpy = vi.fn()
    
    server.use(
      http.get('http://localhost:8000/api/health', () => {
        fetchSpy()
        return HttpResponse.json(mockHealthResponse)
      })
    )

    const wrapper = createWrapper()
    
    // First hook instance
    const { result: result1 } = renderHook(() => useHealthCheck(), { wrapper })
    
    await waitFor(() => {
      expect(result1.current.isSuccess).toBe(true)
    })
    
    // Second hook instance should use cached data
    const { result: result2 } = renderHook(() => useHealthCheck(), { wrapper })
    
    await waitFor(() => {
      expect(result2.current.isSuccess).toBe(true)
    })
    
    // Should only fetch once due to caching
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })
})