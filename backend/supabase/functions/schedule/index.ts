import { corsHeaders, jsonResponse } from '../_shared/cors.ts'
import { getUserId, userClient } from '../_shared/db.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const userId = await getUserId(req)
    const db = userClient(req)
    const url = new URL(req.url)
    const idFromPath = url.pathname.split('/').pop()

    if (req.method === 'POST') {
      const body = await req.json()
      const { data, error } = await db
        .from('scheduled_posts')
        .insert({ ...body, status: 'pending' })
        .select()
        .single()
      if (error) throw error
      return jsonResponse(data, 201)
    }

    if (req.method === 'GET') {
      const { data, error } = await db
        .from('scheduled_posts')
        .select('*, connected_accounts!inner(user_id)')
        .eq('connected_accounts.user_id', userId)
        .order('scheduled_time', { ascending: true })
      if (error) throw error
      return jsonResponse(data)
    }

    if (req.method === 'DELETE' && idFromPath) {
      const { error } = await db.from('scheduled_posts').delete().eq('id', idFromPath)
      if (error) throw error
      return jsonResponse({ ok: true })
    }

    return jsonResponse({ error: 'Not found' }, 404)
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 400)
  }
})
