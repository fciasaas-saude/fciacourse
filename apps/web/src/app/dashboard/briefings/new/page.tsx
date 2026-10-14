'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBriefing } from '../actions';

export default function NewBriefingPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setLoading(true);

    const result = await createBriefing(formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      router.push('/dashboard/briefings');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Novo Briefing</h1>
      </div>

      {error && (
        <div className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <form action={handleSubmit} className="space-y-4 rounded-lg bg-white p-6 shadow">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">
            Título
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            minLength={3}
            maxLength={255}
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="problem_statement" className="block text-sm font-medium text-gray-700">
            Problema / Contexto
          </label>
          <textarea
            id="problem_statement"
            name="problem_statement"
            required
            minLength={10}
            rows={3}
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="target_audience" className="block text-sm font-medium text-gray-700">
            Público-alvo
          </label>
          <input
            id="target_audience"
            name="target_audience"
            type="text"
            required
            minLength={3}
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="desired_outcome" className="block text-sm font-medium text-gray-700">
            Resultado desejado
          </label>
          <textarea
            id="desired_outcome"
            name="desired_outcome"
            required
            minLength={10}
            rows={2}
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="audience_level" className="block text-sm font-medium text-gray-700">
              Nível do público
            </label>
            <input
              id="audience_level"
              name="audience_level"
              type="text"
              maxLength={100}
              placeholder="Ex: Iniciante, Avançado"
              className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="estimated_duration" className="block text-sm font-medium text-gray-700">
              Duração estimada (minutos)
            </label>
            <input
              id="estimated_duration"
              name="estimated_duration"
              type="number"
              min={1}
              className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="requested_format" className="block text-sm font-medium text-gray-700">
              Formato solicitado
            </label>
            <input
              id="requested_format"
              name="requested_format"
              type="text"
              maxLength={100}
              placeholder="Ex: Curso online, Workshop"
              className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="communication_tone" className="block text-sm font-medium text-gray-700">
              Tom de comunicação
            </label>
            <input
              id="communication_tone"
              name="communication_tone"
              type="text"
              maxLength={100}
              placeholder="Ex: Formal, Didático"
              className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label htmlFor="restrictions" className="block text-sm font-medium text-gray-700">
            Restrições / Observações
          </label>
          <textarea
            id="restrictions"
            name="restrictions"
            rows={2}
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Salvando...' : 'Criar Briefing'}
          </button>
          <a
            href="/dashboard/briefings"
            className="text-sm text-gray-600 hover:text-gray-900 hover:underline"
          >
            Cancelar
          </a>
        </div>
      </form>
    </div>
  );
}