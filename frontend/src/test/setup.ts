import '@testing-library/jest-dom'
import { beforeAll, afterEach, afterAll, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import { server } from './mocks/server'

// Mock Chart.js to avoid canvas issues in tests
vi.mock('chart.js', () => ({
  Chart: vi.fn().mockImplementation(() => ({
    destroy: vi.fn(),
    update: vi.fn(),
    resize: vi.fn(),
    render: vi.fn(),
    stop: vi.fn(),
    reset: vi.fn(),
    toBase64Image: vi.fn(),
    generateLegend: vi.fn(),
    canvas: { width: 400, height: 400 }
  })),
  registerables: [],
  CategoryScale: vi.fn(),
  LinearScale: vi.fn(),
  PointElement: vi.fn(),
  LineElement: vi.fn(),
  Title: vi.fn(),
  Tooltip: vi.fn(),
  Legend: vi.fn(),
  BarElement: vi.fn(),
  ArcElement: vi.fn(),
  RadialLinearScale: vi.fn(),
  Filler: vi.fn()
}))

// Mock react-chartjs-2
vi.mock('react-chartjs-2', () => ({
  Line: vi.fn(() => ({ type: 'div', props: { 'data-testid': 'line-chart' } })),
  Bar: vi.fn(() => ({ type: 'div', props: { 'data-testid': 'bar-chart' } })),
  Pie: vi.fn(() => ({ type: 'div', props: { 'data-testid': 'pie-chart' } })),
  Doughnut: vi.fn(() => ({ type: 'div', props: { 'data-testid': 'doughnut-chart' } })),
  Scatter: vi.fn(() => ({ type: 'div', props: { 'data-testid': 'scatter-chart' } })),
  Radar: vi.fn(() => ({ type: 'div', props: { 'data-testid': 'radar-chart' } }))
}))

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
  io: vi.fn(() => mockSocket),
  Socket: vi.fn(() => mockSocket)
}))

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation((callback) => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
  thresholds: [0],
  root: null,
  rootMargin: '0px'
}))

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation((callback) => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}))

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }))
})

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost:3000',
    origin: 'http://localhost:3000',
    protocol: 'http:',
    host: 'localhost:3000',
    hostname: 'localhost',
    port: '3000',
    pathname: '/',
    search: '',
    hash: '',
    assign: vi.fn(),
    replace: vi.fn(),
    reload: vi.fn()
  },
  writable: true
})

// Mock navigator
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true
})

Object.defineProperty(navigator, 'maxTouchPoints', {
  writable: true,
  value: 0
})

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn()
}

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

// Mock IndexedDB
const mockIDBRequest = {
  result: null,
  error: null,
  onsuccess: null,
  onerror: null,
  readyState: 'done'
}

const mockIDBObjectStore = {
  add: vi.fn(() => mockIDBRequest),
  put: vi.fn(() => mockIDBRequest),
  get: vi.fn(() => mockIDBRequest),
  delete: vi.fn(() => mockIDBRequest),
  clear: vi.fn(() => mockIDBRequest),
  count: vi.fn(() => mockIDBRequest),
  getAll: vi.fn(() => mockIDBRequest),
  createIndex: vi.fn(),
  index: vi.fn(() => mockIDBObjectStore)
}

const mockIDBTransaction = {
  objectStore: vi.fn(() => mockIDBObjectStore),
  abort: vi.fn(),
  error: null,
  mode: 'readwrite'
}

const mockIDBDatabase = {
  createObjectStore: vi.fn(() => mockIDBObjectStore),
  deleteObjectStore: vi.fn(),
  transaction: vi.fn(() => mockIDBTransaction),
  close: vi.fn(),
  version: 1,
  name: 'test-db',
  objectStoreNames: {
    contains: vi.fn(() => false)
  }
}

const mockIDBOpenRequest = {
  ...mockIDBRequest,
  onupgradeneeded: null,
  onblocked: null,
  result: mockIDBDatabase
}

global.indexedDB = {
  open: vi.fn(() => mockIDBOpenRequest),
  deleteDatabase: vi.fn(() => mockIDBRequest),
  databases: vi.fn(() => Promise.resolve([])),
  cmp: vi.fn()
}

// Start server before all tests
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))

// Clean up after each test case
afterEach(() => {
  cleanup()
  server.resetHandlers()
  vi.clearAllMocks()
})

// Clean up after all tests
afterAll(() => server.close())

// Mock environment variables
process.env.NODE_ENV = 'test'