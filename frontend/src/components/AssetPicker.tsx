import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { ContentAsset } from '../types'

interface AssetPickerProps {
  value: string | null
  onChange: (id: string) => void
}

export function AssetPicker({ value, onChange }: AssetPickerProps) {
  const { data: assets, isLoading } = useQuery({
    queryKey: ['content-assets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('content_assets')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as ContentAsset[]
    },
  })

  return (
    <select
      className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={isLoading}
    >
      <option value="" disabled>
        {isLoading ? 'Loading assets…' : 'Select a content asset'}
      </option>
      {assets?.map((asset) => (
        <option key={asset.id} value={asset.id}>
          {asset.storage_url.split('/').pop()} ({asset.status})
        </option>
      ))}
    </select>
  )
}
