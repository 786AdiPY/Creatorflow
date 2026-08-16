import { corsHeaders, jsonResponse } from '../_shared/cors.ts'
import { userClient } from '../_shared/db.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const db = userClient(req)
    const scheduledPostId = new URL(req.url).pathname.split('/').pop()
    const { data, error } = await db
      .from('analytics_snapshots')
      .select('*')
      .eq('scheduled_post_id', scheduledPostId)
      .order('fetched_at', { ascending: true })
    if (error) throw error
    return jsonResponse(data)
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 400)
  }
})
