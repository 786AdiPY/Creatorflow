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

  return (
    <div className="divide-y divide-gray-200 rounded-lg border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
      {comments?.length ? (
        comments.map((comment) => (
          <div key={comment.id} className="flex items-center justify-between gap-4 px-4 py-3">
            <div className="min-w-0 text-left">
              <p className="truncate text-sm font-medium">{comment.author}</p>
              <p className="truncate text-sm text-gray-500">{comment.text}</p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                className="rounded-md bg-green-600 px-3 py-1 text-xs font-medium text-white"
                onClick={() => act.mutate({ id: comment.id, action: 'approve' })}
              >
                Approve
              </button>
              <button
                className="rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white"
                onClick={() => act.mutate({ id: comment.id, action: 'hide' })}
              >
                Hide
              </button>
            </div>
          </div>
        ))
      ) : (
        <p className="px-4 py-6 text-center text-sm text-gray-500">Inbox zero. No comments pending review.</p>
      )}
    </div>
  )
}
