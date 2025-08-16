import { useMutation, useQuery } from 'react-query'
import { researchApi } from '@/lib/api'
import { ResearchRequest, ResearchResults, HealthCheck } from '@/types/api'

export const useResearch = () => {
  return useMutation<ResearchResults, Error, ResearchRequest>(
    (request: ResearchRequest) => researchApi.startResearch(request),
    {
      onSuccess: (data) => {
        console.log('Research completed:', data.status)
      },
      onError: (error) => {
        console.error('Research failed:', error.message)
      },
    }
  )
}

export const useHealthCheck = () => {
  return useQuery<HealthCheck, Error>(
    'health',
    researchApi.getHealth,
    {
      refetchInterval: 30000, // Check every 30 seconds
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    }
  )
}

export const useQuickResearch = () => {
  return useMutation<any, Error, string>(
    (query: string) => researchApi.quickResearch(query),
    {
      onSuccess: (data) => {
        console.log('Quick research completed')
      },
      onError: (error) => {
        console.error('Quick research failed:', error.message)
      },
    }
  )
}