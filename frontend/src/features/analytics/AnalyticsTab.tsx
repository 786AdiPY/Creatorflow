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

  return (
    <div className="space-y-4">
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="views" stroke="#9333ea" />
            <Line type="monotone" dataKey="likes" stroke="#22c55e" />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {!chartData.length && <p className="text-sm text-gray-500">No analytics yet — publish a post to see data here.</p>}
    </div>
  )
}
