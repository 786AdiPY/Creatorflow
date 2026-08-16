import { jsonResponse } from '../_shared/cors.ts'
import { serviceClient } from '../_shared/db.ts'
import { getConnector } from '../platforms/mock.ts'

// Invoked on a schedule (pg_cron -> this function, see README) to publish any
// scheduled_posts whose time has come. Keeps the "auto-publishes at time" MVP
// requirement (docs §12) out of the request path entirely.
Deno.serve(async () => {
  const db = serviceClient()

  const { data: due, error } = await db
    .from('scheduled_posts')
    .select('*, connected_accounts(*), content_assets(*), metadata_drafts(*), thumbnails(*)')
    .eq('status', 'pending')
    .lte('scheduled_time', new Date().toISOString())

  if (error) return jsonResponse({ error: error.message }, 500)

  for (const post of due ?? []) {
    try {
      const connector = getConnector(post.connected_accounts.platform)
      const result = await connector.publish(post.connected_account_id, {
        contentAssetUrl: post.content_assets.storage_url,
        title: post.metadata_drafts.title,
        description: post.metadata_drafts.description,
        tags: post.metadata_drafts.tags,
        thumbnailUrl: post.thumbnails?.storage_url,
      })
      await db
        .from('scheduled_posts')
        .update({ status: 'posted', platform_post_id: result.platformPostId })
        .eq('id', post.id)
    } catch (err) {
      await db
        .from('scheduled_posts')
        .update({ status: 'failed', platform_payload: { error: (err as Error).message } })
        .eq('id', post.id)
    }
  }

  return jsonResponse({ published: due?.length ?? 0 })
})
