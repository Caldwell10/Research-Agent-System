import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from 'react-query'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { WebSocketProvider } from '@/contexts/WebSocketContext'
import { vi } from 'vitest'

// Mock WebSocket for testing
const mockWebSocket = {
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
  disconnect: vi.fn(),
  connect: vi.fn(),
  connected: true,
  id: 'test-socket-id'
}

// Create a fresh query client for each test
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      cacheTime: 0,
      staleTime: 0
    },
    mutations: {
      retry: false
    }
  }
})

interface AllTheProvidersProps {
  children: React.ReactNode
  queryClient?: QueryClient
}

const AllTheProviders = ({ children, queryClient }: AllTheProvidersProps) => {
  const client = queryClient || createTestQueryClient()
  
  return (
    <QueryClientProvider client={client}>
      <BrowserRouter>
        <ThemeProvider>
          <WebSocketProvider>
            {children}
          </WebSocketProvider>
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient
  initialRoute?: string
}

const customRender = (
  ui: ReactElement,
  options: CustomRenderOptions = {}
) => {
  const { queryClient, initialRoute = '/', ...renderOptions } = options
  
  // Set initial route if provided
  if (initialRoute !== '/') {
    window.history.pushState({}, 'Test page', initialRoute)
  }
  
  return render(ui, {
    wrapper: (props) => <AllTheProviders {...props} queryClient={queryClient} />,
    ...renderOptions
  })
}

// Mock hook implementations for testing
export const createMockHook = <T,>(returnValue: T) => {
  return vi.fn(() => returnValue)
}

// WebSocket mock utilities
export const mockWebSocketEvents = {
  triggerConnect: () => {
    mockWebSocket.connected = true
  },
  
  triggerDisconnect: () => {
    mockWebSocket.connected = false
  },
  
  emitMessage: (event: string, data: any) => {
    const handler = mockWebSocket.on.mock.calls.find(call => call[0] === event)?.[1]
    if (handler) {
      handler(data)
    }
  },
  
  getEmittedMessages: () => {
    return mockWebSocket.emit.mock.calls
  },
  
  reset: () => {
    vi.clearAllMocks()
    mockWebSocket.connected = true
  }
}

// Viewport utilities for mobile testing
export const setMobileViewport = () => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: 375
  })
  
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: 667
  })
  
  // Trigger resize event
  window.dispatchEvent(new Event('resize'))
}

export const setDesktopViewport = () => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: 1024
  })
  
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: 768
  })
  
  // Trigger resize event
  window.dispatchEvent(new Event('resize'))
}

// Touch event utilities
export const createTouchEvent = (type: string, touches: Array<{ clientX: number; clientY: number }>) => {
  return new TouchEvent(type, {
    touches: touches.map(touch => ({
      ...touch,
      identifier: 0,
      target: document.body,
      radiusX: 0,
      radiusY: 0,
      rotationAngle: 0,
      force: 1
    } as Touch))
  })
}

// Local storage mock utilities
export const mockLocalStorage = {
  clear: () => {
    const localStorage = window.localStorage
    localStorage.clear.mockClear()
    localStorage.getItem.mockClear()
    localStorage.setItem.mockClear()
    localStorage.removeItem.mockClear()
  },
  
  setItem: (key: string, value: string) => {
    const localStorage = window.localStorage
    localStorage.getItem.mockImplementation((k) => k === key ? value : null)
  },
  
  getItem: (key: string) => {
    const localStorage = window.localStorage
    return localStorage.getItem(key)
  }
}

// Animation utilities
export const mockAnimations = () => {
  // Mock requestAnimationFrame
  global.requestAnimationFrame = vi.fn(cb => setTimeout(cb, 16))
  global.cancelAnimationFrame = vi.fn()
  
  // Mock CSS animations
  Element.prototype.animate = vi.fn(() => ({
    finished: Promise.resolve(),
    cancel: vi.fn(),
    finish: vi.fn(),
    pause: vi.fn(),
    play: vi.fn(),
    reverse: vi.fn(),
    updatePlaybackRate: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }))
}

// Network status utilities
export const mockNetworkStatus = {
  online: () => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true
    })
    window.dispatchEvent(new Event('online'))
  },
  
  offline: () => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false
    })
    window.dispatchEvent(new Event('offline'))
  }
}


// Wait utilities
export const waitForAnimation = () => new Promise(resolve => setTimeout(resolve, 100))
export const waitForDebounce = () => new Promise(resolve => setTimeout(resolve, 300))

// Re-export everything from testing-library
export * from '@testing-library/react'
export { customRender as render }