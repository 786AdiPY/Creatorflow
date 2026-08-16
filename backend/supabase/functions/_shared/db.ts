import { createClient } from 'jsr:@supabase/supabase-js@2'

// Service-role client for use inside Edge Functions only — never expose this key to the frontend.
export function serviceClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )
}

// Client scoped to the caller's JWT, so RLS policies apply as that user.
export function userClient(req: Request) {
  const authHeader = req.headers.get('Authorization') ?? ''
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  )
}

export async function getUserId(req: Request) {
  const client = userClient(req)
  const { data, error } = await client.auth.getUser()
  if (error || !data.user) throw new Error('Unauthorized')
  return data.user.id
}
