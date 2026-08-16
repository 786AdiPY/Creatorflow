import { serviceClient } from './db.ts'

// Every long-running module operation (render, transcode, LLM call, publish, analytics fetch)
// creates a row here immediately and returns its id — the POST never blocks on the work itself.
export async function createJob(userId: string, jobType: string) {
  const db = serviceClient()
  const { data, error } = await db
    .from('jobs')
    .insert({ user_id: userId, job_type: jobType, status: 'pending', progress: 0 })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateJob(
  jobId: string,
  patch: { status?: string; progress?: number; error?: string; result_ref?: string },
) {
  const db = serviceClient()
  const { error } = await db
    .from('jobs')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', jobId)
  if (error) throw error
}
