import { supabase } from './supabase';

const BUCKET = 'content-assets';

/** Uploads a file to Storage and registers it as a content_asset. Shared by
 * Studio's "Upload asset" and Library's asset picker. */
export async function uploadContentAsset(file: File) {
  const path = `${crypto.randomUUID()}-${file.name}`;
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file);
  if (uploadError) throw uploadError;

  const { data: publicUrl } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const { data: asset, error: insertError } = await supabase
    .from('content_assets')
    .insert({ source_type: 'upload', storage_url: publicUrl.publicUrl, status: 'ready' })
    .select()
    .single();
  if (insertError) throw insertError;

  return asset as { id: string; storage_url: string };
}
