import { corsHeaders, jsonResponse } from '../_shared/cors.ts'
import { getUserId, serviceClient } from '../_shared/db.ts'
import { createJob, updateJob } from '../_shared/jobs.ts'
import { openRouterComplete } from '../_shared/openrouter.ts'

const PLATFORM_LIMITS: Record<string, { title: number; description: number; tags: number }> = {
  youtube: { title: 100, description: 5000, tags: 15 },
  instagram: { title: 0, description: 2200, tags: 30 },
  tiktok: { title: 0, description: 2200, tags: 10 },
}

// Generates title/description/tags via OpenRouter, constrained by a platform char-limit
// validation pass (docs §3). Async by contract: returns job_id, generates in the background.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  try {
    const userId = await getUserId(req)
    const { content_asset_id, platform } = await req.json()
    const job = await createJob(userId, 'metadata_generate')

    // @ts-ignore Deno Deploy / Supabase Edge Runtime global
    EdgeRuntime.waitUntil(generateMetadata(job.id, content_asset_id, platform))

    return jsonResponse({ job_id: job.id }, 202)
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 400)
  }
})

async function generateMetadata(jobId: string, contentAssetId: string, platform: string) {
  const db = serviceClient()
  try {
    await updateJob(jobId, { status: 'processing', progress: 0.2 })

    const limits = PLATFORM_LIMITS[platform] ?? { title: 100, description: 2000, tags: 15 }

    const { data: asset } = await db
      .from('content_assets')
      .select('storage_url, source_type')
      .eq('id', contentAssetId)
      .single()

    const raw = await openRouterComplete(
      [
        {
          role: 'system',
          content:
            'You write high-CTR, platform-appropriate social media metadata. ' +
            'Respond with strict JSON only: {"title": string, "description": string, "tags": string[]}. ' +
            `Title must be ${limits.title || 'omitted (empty string)'} characters or fewer. ` +
            `Description must be ${limits.description} characters or fewer. ` +
            `Provide at most ${limits.tags} tags.`,
        },
        {
          role: 'user',
          content: `Platform: ${platform}\nContent asset: ${asset?.storage_url ?? contentAssetId} (${asset?.source_type ?? 'unknown'})\nGenerate title, description, and tags for this content.`,
        },
      ],
      { json: true },
    )

    const parsed = JSON.parse(raw) as { title: string; description: string; tags: string[] }

    const draft = {
      content_asset_id: contentAssetId,
      platform,
      title: limits.title ? (parsed.title ?? '').slice(0, limits.title) : '',
      description: (parsed.description ?? '').slice(0, limits.description),
      tags: (parsed.tags ?? []).slice(0, limits.tags),
      generated_by: 'ai',
    }

    const { data, error } = await db.from('metadata_drafts').insert(draft).select().single()
    if (error) throw error

    await updateJob(jobId, { status: 'done', progress: 1, result_ref: data.id })
  } catch (err) {
    await updateJob(jobId, { status: 'failed', error: (err as Error).message })
  }
}
