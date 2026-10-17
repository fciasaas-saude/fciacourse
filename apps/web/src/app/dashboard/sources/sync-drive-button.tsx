'use client';

import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export function SyncDriveButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success?: boolean; imported?: number; message?: string; error?: string } | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
  );

  async function handleSync() {
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('sync-google-drive');
      if (error) throw new Error(error.message || 'Falha ao sincronizar com o Google Drive.');
      setResult(data);
    } catch (err) {
      setResult({ error: (err as Error).message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button onClick={handleSync} disabled={loading} className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
        {loading ? 'Sincronizando...' : 'Sincronizar Livros da Pasta do Drive'}
      </button>
      {result?.error && <p className="text-xs text-red-600">{result.error}</p>}
      {result?.success && <p className="text-xs text-emerald-700">{result.imported === 0 ? result.message ?? 'Nenhum livro novo encontrado.' : `${result.imported} livro(s) importado(s) com sucesso.`}</p>}
    </div>
  );
}