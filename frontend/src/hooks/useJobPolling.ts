import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'

const TERMINAL_STATUSES = new Set(['done', 'failed'])

export function useJobPolling(jobId: string | null) {
  return useQuery({
    queryKey: ['job', jobId],
    queryFn: () => api.jobs.get(jobId as string),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status && TERMINAL_STATUSES.has(status) ? false : 1500
    },
  })
}
