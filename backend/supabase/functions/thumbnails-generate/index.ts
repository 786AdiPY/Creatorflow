import { corsHeaders, jsonResponse } from '../_shared/cors.ts'
import { getUserId } from '../_shared/db.ts'
import { createJob, updateJob } from '../_shared/jobs.ts'
import { serviceClient } from '../_shared/db.ts'

// Generates thumbnail variants for a content asset. Kicks off a background job and
// returns job_id immediately — rendering happens after the response (async by contract, docs §5).
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  try {
    const userId = await getUserId(req)
    const { content_asset_id, style_prompt } = await req.json()
    const job = await createJob(userId, 'thumbnail_render')

    // Fire and forget: EdgeRuntime.waitUntil keeps the function alive past the response.
    // @ts-ignore Deno Deploy / Supabase Edge Runtime global
    EdgeRuntime.waitUntil(renderThumbnails(job.id, content_asset_id, style_prompt))

    return jsonResponse({ job_id: job.id }, 202)
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 400)
  }
})

async function renderThumbnails(jobId: string, contentAssetId: string, _stylePrompt?: string) {
  const db = serviceClient()
  try {
    await updateJob(jobId, { status: 'processing', progress: 0.1 })

    // TODO: call an image-gen API (or Pillow-equivalent service) and upload results to Storage.
    // Placeholder variants so the pipeline is exercisable end-to-end without a real provider.
    const variants = [1, 2].map((n) => ({
      content_asset_id: contentAssetId,
      storage_url: `https://placehold.co/1280x720?text=Variant+${n}`,
      variant_label: `variant_${n}`,
      generation_params: {},
    }))

    const { error } = await db.from('thumbnails').insert(variants)
    if (error) throw error

    await updateJob(jobId, { status: 'done', progress: 1 })
  } catch (err) {
    await updateJob(jobId, { status: 'failed', error: (err as Error).message })
  }
}
