import { corsHeaders, jsonResponse } from '../_shared/cors.ts'
import { userClient } from '../_shared/db.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'PATCH') return jsonResponse({ error: 'Method not allowed' }, 405)

  try {
    const db = userClient(req)
    const id = new URL(req.url).pathname.split('/').pop()
    const patch = await req.json()
    const { data, error } = await db.from('metadata_drafts').update(patch).eq('id', id).select().single()
    if (error) throw error
    return jsonResponse(data)
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 400)
  }
})
