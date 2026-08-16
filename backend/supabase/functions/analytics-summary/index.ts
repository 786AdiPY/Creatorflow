import { corsHeaders, jsonResponse } from '../_shared/cors.ts'
import { getUserId, userClient } from '../_shared/db.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const userId = await getUserId(req)
    const db = userClient(req)
    const { data, error } = await db
      .from('analytics_snapshots')
      .select('*, scheduled_posts!inner(content_assets!inner(user_id))')
      .eq('scheduled_posts.content_assets.user_id', userId)
      .order('fetched_at', { ascending: true })
    if (error) throw error
    return jsonResponse(data)
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 400)
  }
})
