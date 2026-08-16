import { useQuery } from '@tanstack/react-query'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { supabase } from '../../lib/supabase'
import type { AnalyticsSnapshot } from '../../types'

export function AnalyticsTab() {
  const { data: snapshots } = useQuery({
    queryKey: ['analytics-snapshots'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('analytics_snapshots')
        .select('*')
        .order('fetched_at', { ascending: true })
      if (error) throw error
      return data as AnalyticsSnapshot[]
    },
  })

  const chartData = (snapshots ?? []).map((s) => ({
    date: new Date(s.fetched_at).toLocaleDateString(),
    views: s.metrics.views ?? 0,
    likes: s.metrics.likes ?? 0,
  }))

  const totals = chartData.reduce(
    (acc, d) => ({ views: acc.views + d.views, likes: acc.likes + d.likes }),
    { views: 0, likes: 0 },
  )

  if (!chartData.length) {
    return (
      <div className="card">
        <p className="muted">No analytics yet — publish a post to see data here.</p>
      </div>
    )
  }

  return (
    <div className="stack">
      <div className="grid-stats">
        <div className="stat">
          <span className="stat__label">Total views</span>
          <span className="stat__value">{totals.views.toLocaleString()}</span>
        </div>
        <div className="stat">
          <span className="stat__label">Total likes</span>
          <span className="stat__value">{totals.likes.toLocaleString()}</span>
        </div>
        <div className="stat">
          <span className="stat__label">Snapshots</span>
          <span className="stat__value">{chartData.length}</span>
        </div>
      </div>

      <div className="card" style={{ height: 288 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="date" stroke="var(--color-muted)" fontSize={12} />
            <YAxis stroke="var(--color-muted)" fontSize={12} />
            <Tooltip
              contentStyle={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                fontSize: 'var(--font-size-sm)',
              }}
            />
            <Line type="monotone" dataKey="views" stroke="var(--color-primary)" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="likes" stroke="var(--color-good)" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
