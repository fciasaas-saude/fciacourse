'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSource } from '../actions';

export default function NewSourcePage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setLoading(true);

    const result = await createSource(formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      router.push('/dashboard/sources');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Nova Fonte</h1>
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
            maxLength={500}
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="source_type" className="block text-sm font-medium text-gray-700">
              Tipo de Fonte
            </label>
            <select
              id="source_type"
              name="source_type"
              required
              className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Selecione...</option>
              <option value="book">Livro</option>
              <option value="article">Artigo</option>
              <option value="report">Relatório</option>
              <option value="video">Vídeo</option>
              <option value="podcast">Podcast</option>
              <option value="internal_document">Documento Interno</option>
              <option value="legislation">Legislação</option>
              <option value="other">Outro</option>
            </select>
          </div>

          <div>
            <label htmlFor="rights_status" className="block text-sm font-medium text-gray-700">
              Status de Direitos
            </label>
            <select
              id="rights_status"
              name="rights_status"
              className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="pending_review">Pendente</option>
              <option value="public_domain">Domínio Público</option>
              <option value="creative_commons">Creative Commons</option>
              <option value="licensed">Licenciado</option>
              <option value="fair_use">Fair Use</option>
              <option value="proprietary">Proprietário</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="author" className="block text-sm font-medium text-gray-700">
              Autor
            </label>
            <input
              id="author"
              name="author"
              type="text"
              maxLength={300}
              className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="publisher" className="block text-sm font-medium text-gray-700">
              Editora / Publicador
            </label>
            <input
              id="publisher"
              name="publisher"
              type="text"
              maxLength={300}
              className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="publication_year" className="block text-sm font-medium text-gray-700">
              Ano de Publicação
            </label>
            <input
              id="publication_year"
              name="publication_year"
              type="number"
              min={1900}
              max={2026}
              className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="language" className="block text-sm font-medium text-gray-700">
              Idioma
            </label>
            <input
              id="language"
              name="language"
              type="text"
              defaultValue="pt-BR"
              maxLength={10}
              className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="page_count" className="block text-sm font-medium text-gray-700">
              Nº de Páginas
            </label>
            <input
              id="page_count"
              name="page_count"
              type="number"
              min={1}
              className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label htmlFor="drive_url" className="block text-sm font-medium text-gray-700">
            URL do Google Drive
          </label>
          <input
            id="drive_url"
            name="drive_url"
            type="url"
            placeholder="https://drive.google.com/..."
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="drive_file_id" className="block text-sm font-medium text-gray-700">
            ID do Arquivo no Drive
          </label>
          <input
            id="drive_file_id"
            name="drive_file_id"
            type="text"
            maxLength={255}
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="permission_notes" className="block text-sm font-medium text-gray-700">
            Notas de Permissão
          </label>
          <textarea
            id="permission_notes"
            name="permission_notes"
            rows={2}
            maxLength={2000}
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Salvando...' : 'Cadastrar Fonte'}
          </button>
          <a
            href="/dashboard/sources"
            className="text-sm text-gray-600 hover:text-gray-900 hover:underline"
          >
            Cancelar
          </a>
        </div>
      </form>
    </div>
  );
}