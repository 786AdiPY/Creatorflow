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
      const { source_type, storage_url } = await req.json()
      const { data, error } = await db
        .from('content_assets')
        .insert({ user_id: userId, source_type, storage_url, status: 'ready' })
        .select()
        .single()
      if (error) throw error
      return jsonResponse(data, 201)
    }

    if (req.method === 'GET' && idFromPath && idFromPath !== 'content') {
      const { data, error } = await db.from('content_assets').select('*').eq('id', idFromPath).single()
      if (error) throw error
      return jsonResponse(data)
    }

    return jsonResponse({ error: 'Not found' }, 404)
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 400)
  }
})
