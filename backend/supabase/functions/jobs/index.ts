import { corsHeaders, jsonResponse } from '../_shared/cors.ts'
import { userClient } from '../_shared/db.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const db = userClient(req)
    const id = new URL(req.url).pathname.split('/').pop()
    const { data, error } = await db.from('jobs').select('*').eq('id', id).single()
    if (error) throw error
    return jsonResponse(data)
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 400)
  }
})
