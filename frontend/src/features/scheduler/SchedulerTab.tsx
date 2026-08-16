import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { PlatformIcon } from '../../components/PlatformIcon'
import type { ScheduledPost, ConnectedAccount } from '../../types'

export function SchedulerTab({ contentAssetId }: { contentAssetId: string | null }) {
  const { data: posts } = useQuery({
    queryKey: ['scheduled-posts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scheduled_posts')
        .select('*, connected_accounts(*)')
        .order('scheduled_time', { ascending: true })
      if (error) throw error
      return data as (ScheduledPost & { connected_accounts: ConnectedAccount })[]
    },
  })

  return (
    <div className="space-y-4">
      {!contentAssetId && (
        <p className="text-sm text-gray-500">Select a content asset, then schedule it once metadata + thumbnail are ready.</p>
      )}

      <div className="divide-y divide-gray-200 rounded-lg border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
        {posts?.length ? (
          posts.map((post) => (
            <div key={post.id} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <PlatformIcon platform={post.connected_accounts.platform} />
                <span className="text-sm">{new Date(post.scheduled_time).toLocaleString()}</span>
              </div>
              <span className="text-xs uppercase text-gray-500">{post.status}</span>
            </div>
          ))
        ) : (
          <p className="px-4 py-6 text-center text-sm text-gray-500">No scheduled posts yet.</p>
        )}
      </div>
    </div>
  )
}
