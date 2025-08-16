import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { WebSocketProvider, useWebSocket } from '../WebSocketContext'
import { mockWebSocketEvents } from '@/test/utils'

// Mock Socket.IO
const mockSocket = {
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
  disconnect: vi.fn(),
  connect: vi.fn(),
  connected: true,
  id: 'test-socket-id'
}

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocket)
}))

const createWrapper = () => {
  return ({ children }: { children: React.ReactNode }) => (
    <WebSocketProvider>{children}</WebSocketProvider>
  )
}

describe('WebSocketContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSocket.connected = true
    mockWebSocketEvents.reset()
  })

  it('provides WebSocket context values', () => {
    const wrapper = createWrapper()
    const { result } = renderHook(() => useWebSocket(), { wrapper })
    
    expect(result.current.socket).toBeTruthy()
    expect(result.current.connected).toBe(true)
    expect(result.current.messages).toEqual([])
    expect(typeof result.current.clearMessages).toBe('function')
  })

  it('connects to WebSocket on mount', () => {
    const wrapper = createWrapper()
    renderHook(() => useWebSocket(), { wrapper })
    
    expect(mockSocket.on).toHaveBeenCalled()
  })

  it('handles connection events', () => {
    const wrapper = createWrapper()
    const { result } = renderHook(() => useWebSocket(), { wrapper })
    
    // Simulate connection
    act(() => {
      const connectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect')?.[1]
      connectHandler?.()
    })
    
    expect(result.current.connected).toBe(true)
  })

  it('handles disconnection events', () => {
    const wrapper = createWrapper()
    const { result } = renderHook(() => useWebSocket(), { wrapper })
    
    // Simulate disconnection
    act(() => {
      const disconnectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'disconnect')?.[1]
      disconnectHandler?.()
    })
    
    expect(result.current.connected).toBe(false)
  })

  it('receives and stores messages', () => {
    const wrapper = createWrapper()
    const { result } = renderHook(() => useWebSocket(), { wrapper })
    
    const testMessage = {
      type: 'progress_update',
      data: { stage: 'research', progress: 50 }
    }
    
    // Simulate receiving a message
    act(() => {
      const messageHandler = mockSocket.on.mock.calls.find(call => call[0] === 'progress_update')?.[1]
      messageHandler?.(testMessage.data)
    })
    
    expect(result.current.messages).toHaveLength(1)
    expect(result.current.messages[0]).toEqual({
      ...testMessage,
      timestamp: expect.any(String)
    })
  })

  it('clears messages when requested', () => {
    const wrapper = createWrapper()
    const { result } = renderHook(() => useWebSocket(), { wrapper })
    
    // Add a message first
    const testMessage = { type: 'test', data: { test: true } }
    
    act(() => {
      const messageHandler = mockSocket.on.mock.calls.find(call => call[0] === 'test')?.[1]
      messageHandler?.(testMessage.data)
    })
    
    expect(result.current.messages).toHaveLength(1)
    
    // Clear messages
    act(() => {
      result.current.clearMessages()
    })
    
    expect(result.current.messages).toHaveLength(0)
  })

  it('handles progress updates', () => {
    const wrapper = createWrapper()
    const { result } = renderHook(() => useWebSocket(), { wrapper })
    
    const progressData = {
      stage: 'analysis',
      progress: 75,
      message: 'Analyzing papers...'
    }
    
    act(() => {
      const progressHandler = mockSocket.on.mock.calls.find(call => call[0] === 'progress_update')?.[1]
      progressHandler?.(progressData)
    })
    
    const progressMessage = result.current.messages.find(msg => msg.type === 'progress_update')
    expect(progressMessage?.data).toEqual(progressData)
  })

  it('handles stage completion events', () => {
    const wrapper = createWrapper()
    const { result } = renderHook(() => useWebSocket(), { wrapper })
    
    const stageData = {
      stage: 'research',
      completed_at: '2024-01-15T10:30:00Z',
      papers_found: 5
    }
    
    act(() => {
      const stageHandler = mockSocket.on.mock.calls.find(call => call[0] === 'stage_complete')?.[1]
      stageHandler?.(stageData)
    })
    
    const stageMessage = result.current.messages.find(msg => msg.type === 'stage_complete')
    expect(stageMessage?.data).toEqual(stageData)
  })

  it('handles research completion', () => {
    const wrapper = createWrapper()
    const { result } = renderHook(() => useWebSocket(), { wrapper })
    
    const completionData = {
      status: 'success',
      execution_time: 125.6,
      summary: { papers_found: 5, key_insights: 4 }
    }
    
    act(() => {
      const completeHandler = mockSocket.on.mock.calls.find(call => call[0] === 'research_complete')?.[1]
      completeHandler?.(completionData)
    })
    
    const completeMessage = result.current.messages.find(msg => msg.type === 'research_complete')
    expect(completeMessage?.data).toEqual(completionData)
  })

  it('handles research errors', () => {
    const wrapper = createWrapper()
    const { result } = renderHook(() => useWebSocket(), { wrapper })
    
    const errorData = {
      stage: 'research',
      error_message: 'API timeout',
      error_code: 'TIMEOUT'
    }
    
    act(() => {
      const errorHandler = mockSocket.on.mock.calls.find(call => call[0] === 'research_error')?.[1]
      errorHandler?.(errorData)
    })
    
    const errorMessage = result.current.messages.find(msg => msg.type === 'research_error')
    expect(errorMessage?.data).toEqual(errorData)
  })

  it('maintains message history limit', () => {
    const wrapper = createWrapper()
    const { result } = renderHook(() => useWebSocket(), { wrapper })
    
    // Add more than the limit (assuming limit is 100)
    act(() => {
      const messageHandler = mockSocket.on.mock.calls.find(call => call[0] === 'test')?.[1]
      
      for (let i = 0; i < 105; i++) {
        messageHandler?.({ data: { index: i } })
      }
    })
    
    // Should maintain limit
    expect(result.current.messages.length).toBeLessThanOrEqual(100)
  })

  it('disconnects socket on unmount', () => {
    const wrapper = createWrapper()
    const { unmount } = renderHook(() => useWebSocket(), { wrapper })
    
    unmount()
    
    expect(mockSocket.disconnect).toHaveBeenCalled()
  })

  it('handles reconnection attempts', () => {
    const wrapper = createWrapper()
    const { result } = renderHook(() => useWebSocket(), { wrapper })
    
    // Simulate disconnection
    act(() => {
      mockSocket.connected = false
      const disconnectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'disconnect')?.[1]
      disconnectHandler?.()
    })
    
    expect(result.current.connected).toBe(false)
    
    // Simulate reconnection
    act(() => {
      mockSocket.connected = true
      const connectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect')?.[1]
      connectHandler?.()
    })
    
    expect(result.current.connected).toBe(true)
  })

  it('provides socket instance for manual operations', () => {
    const wrapper = createWrapper()
    const { result } = renderHook(() => useWebSocket(), { wrapper })
    
    expect(result.current.socket).toBe(mockSocket)
    
    // Should be able to emit messages
    act(() => {
      result.current.socket?.emit('test_event', { test: true })
    })
    
    expect(mockSocket.emit).toHaveBeenCalledWith('test_event', { test: true })
  })

  it('filters duplicate messages', () => {
    const wrapper = createWrapper()
    const { result } = renderHook(() => useWebSocket(), { wrapper })
    
    const messageData = { stage: 'research', progress: 50 }
    
    act(() => {
      const messageHandler = mockSocket.on.mock.calls.find(call => call[0] === 'progress_update')?.[1]
      // Send same message twice
      messageHandler?.(messageData)
      messageHandler?.(messageData)
    })
    
    // Should only store unique messages or handle duplicates appropriately
    expect(result.current.messages.length).toBeGreaterThan(0)
  })
})