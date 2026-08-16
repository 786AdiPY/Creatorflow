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
    <div className="stack">
      {!contentAssetId && (
        <p className="muted">Select a content asset, then schedule it once metadata + thumbnail are ready.</p>
      )}

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Platform</th>
              <th>Scheduled</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {posts?.length ? (
              posts.map((post) => (
                <tr key={post.id}>
                  <td>
                    <PlatformIcon platform={post.connected_accounts.platform} />
                  </td>
                  <td>{new Date(post.scheduled_time).toLocaleString()}</td>
                  <td>
                    <span className={`chip chip--${post.status === 'posted' ? 'done' : post.status === 'failed' ? 'failed' : 'processing'}`}>
                      {post.status}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="muted" style={{ textAlign: 'center' }}>
                  No scheduled posts yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
