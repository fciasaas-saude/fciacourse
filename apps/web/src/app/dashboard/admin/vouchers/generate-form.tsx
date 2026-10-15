'use client';

import { useState } from 'react';
import { generateVoucherBatch } from './actions';

export function GenerateVoucherForm() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success?: boolean; generated?: number; error?: string } | null>(null);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setResult(null);
    try {
      const res = await generateVoucherBatch(formData);
      setResult(res);
    } catch (err) {
      setResult({ error: (err as Error).message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-6">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Gerar Novo Lote de Vouchers</h2>
      <form action={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-medium uppercase text-gray-600">Nome do Lote</label>
          <input
            name="batch_name"
            required
            minLength={2}
            maxLength={100}
            placeholder="Ex: Piloto Outubro 2026"
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium uppercase text-gray-600">Quantidade</label>
          <input
            name="quantity"
            type="number"
            required
            min={1}
            max={500}
            defaultValue={10}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium uppercase text-gray-600">Usos por Código</label>
          <input
            name="max_uses"
            type="number"
            min={1}
            max={1000}
            defaultValue={1}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div className="md:col-span-3 flex items-center gap-4">
          <button
            type="submit"
            disabled={loading}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Gerando...' : 'Gerar Lote'}
          </button>
          {result?.error && <p className="text-xs text-red-600">{result.error}</p>}
          {result?.success && (
            <p className="text-xs text-emerald-700">
              {result.generated} voucher(s) gerado(s) com sucesso.
            </p>
          )}
        </div>
      </form>
    </section>
  );
}