import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { ConnectedAccount } from '../types'

export function useConnectedAccounts() {
  return useQuery({
    queryKey: ['connected-accounts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('connected_accounts').select('*')
      if (error) throw error
      return data as ConnectedAccount[]
    },
  })
}
