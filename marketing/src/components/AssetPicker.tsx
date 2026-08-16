import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface ContentAsset {
  id: string;
  storage_url: string;
  status: string;
  created_at: string;
}

export function AssetPicker({ value, onChange, refreshKey }: { value: string | null; onChange: (id: string) => void; refreshKey?: number }) {
  const [assets, setAssets] = useState<ContentAsset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    supabase
      .from('content_assets')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (cancelled) return;
        setAssets(data ?? []);
        setLoading(false);
        if (data?.length && !value) onChange(data[0].id);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  return (
    <select className="lib-select" value={value ?? ''} onChange={(e) => onChange(e.target.value)} disabled={loading}>
      <option value="" disabled>
        {loading ? 'Loading assets…' : assets.length ? 'Select a content asset' : 'No assets yet — upload one'}
      </option>
      {assets.map((a) => (
        <option key={a.id} value={a.id}>
          {a.storage_url.split('/').pop()} · {a.status}
        </option>
      ))}
    </select>
  );
}
