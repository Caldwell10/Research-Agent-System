import axios from 'axios'
import { ResearchRequest, ResearchResults, HealthCheck } from '@/types/api'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 300000, // 5 minutes for research requests
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    console.log(`Making ${config.method?.toUpperCase()} request to ${config.url}`)
    return config
  },
  (error) => {
    console.error('Request error:', error)
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log(`Received response from ${response.config.url}:`, response.status)
    return response
  },
  (error) => {
    console.error('Response error:', error.response?.data || error.message)
    return Promise.reject(error)
  }
)

export const researchApi = {
  // Start a research analysis
  startResearch: async (request: ResearchRequest): Promise<ResearchResults> => {
    const response = await api.post<ResearchResults>('/api/research', request)
    return response.data
  },

  // Get health status
  getHealth: async (): Promise<HealthCheck> => {
    const response = await api.get<HealthCheck>('/api/health')
    return response.data
  },

  // Quick research (using summary endpoint if available)
  quickResearch: async (query: string): Promise<any> => {
    const response = await api.get(`/api/research/summary?query=${encodeURIComponent(query)}`)
    return response.data
  }
}

export default api