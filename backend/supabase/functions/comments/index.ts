import { corsHeaders, jsonResponse } from '../_shared/cors.ts'
import { userClient } from '../_shared/db.ts'
import { getConnector } from '../platforms/mock.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const db = userClient(req)
    const parts = new URL(req.url).pathname.split('/').filter(Boolean)
    // routes: /comments/{scheduled_post_id}  and  /comments/{id}/action
    const isAction = parts.at(-1) === 'action'
    const id = isAction ? parts.at(-2) : parts.at(-1)

    if (req.method === 'POST' && isAction) {
      const { action } = await req.json()
      const { data: comment, error: fetchErr } = await db
        .from('comments')
        .select('*, scheduled_posts(connected_account_id, platform_post_id)')
        .eq('id', id)
        .single()
      if (fetchErr) throw fetchErr

      const connector = getConnector('youtube')
      await connector.moderateComment(comment.scheduled_posts.connected_account_id, comment.platform_comment_id, {
        action,
      })

      const moderationAction = action === 'approve' ? 'approved' : action === 'hide' ? 'hidden' : 'flagged'
      const { data, error } = await db
        .from('comments')
        .update({ moderation_action: moderationAction })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return jsonResponse(data)
    }

    if (req.method === 'GET') {
      const { data, error } = await db.from('comments').select('*').eq('scheduled_post_id', id)
      if (error) throw error
      return jsonResponse(data)
    }

    return jsonResponse({ error: 'Not found' }, 404)
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 400)
  }
})
