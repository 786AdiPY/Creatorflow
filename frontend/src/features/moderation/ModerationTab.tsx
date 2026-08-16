import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { api } from '../../api/client'
import type { Comment } from '../../types'

export function ModerationTab() {
  const queryClient = useQueryClient()

  const { data: comments } = useQuery({
    queryKey: ['comments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .is('moderation_action', null)
        .order('fetched_at', { ascending: false })
      if (error) throw error
      return data as Comment[]
    },
  })

  const act = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'hide' | 'flag' | 'approve' }) =>
      api.comments.action(id, action),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['comments'] }),
  })

  if (!comments?.length) {
    return (
      <div className="card">
        <p className="muted">Inbox zero. No comments pending review.</p>
      </div>
    )
  }

  return (
    <div className="stack">
      {comments.map((comment) => (
        <div key={comment.id} className="card row" style={{ justifyContent: 'space-between' }}>
          <div style={{ minWidth: 0, textAlign: 'left' }}>
            <p style={{ fontWeight: 600 }}>{comment.author}</p>
            <p className="muted">{comment.text}</p>
          </div>
          <div className="row" style={{ flex: 'none' }}>
            <button className="btn btn--sm" onClick={() => act.mutate({ id: comment.id, action: 'approve' })}>
              Approve
            </button>
            <button className="btn btn--sm btn--danger" onClick={() => act.mutate({ id: comment.id, action: 'hide' })}>
              Hide
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
