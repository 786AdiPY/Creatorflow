import { corsHeaders, jsonResponse } from '../_shared/cors.ts'
import { getUserId, serviceClient } from '../_shared/db.ts'
import { createJob, updateJob } from '../_shared/jobs.ts'

// Analyzes a long-form asset for clip-worthy moments. Real implementation would run
// ffmpeg + a scene/highlight-scoring pass; this stub proves the job + data-flow contract.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  try {
    const userId = await getUserId(req)
    const { content_asset_id } = await req.json()
    const job = await createJob(userId, 'clip_analysis')

    // @ts-ignore Deno Deploy / Supabase Edge Runtime global
    EdgeRuntime.waitUntil(analyzeClips(job.id, content_asset_id))

    return jsonResponse({ job_id: job.id }, 202)
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 400)
  }
})

async function analyzeClips(jobId: string, contentAssetId: string) {
  const db = serviceClient()
  try {
    await updateJob(jobId, { status: 'processing', progress: 0.1 })

    // TODO: run ffmpeg scene detection / highlight scoring over the source asset.
    const candidate = {
      content_asset_id: contentAssetId,
      start_ms: 0,
      end_ms: 30000,
      storage_url: '',
      score: 0.5,
      status: 'done',
    }

    const { error } = await db.from('clips').insert(candidate)
    if (error) throw error

    await updateJob(jobId, { status: 'done', progress: 1 })
  } catch (err) {
    await updateJob(jobId, { status: 'failed', error: (err as Error).message })
  }
}
