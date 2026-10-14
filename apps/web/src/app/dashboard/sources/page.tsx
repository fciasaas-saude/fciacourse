import { getSources } from './actions';
import Link from 'next/link';

const sourceTypeLabels: Record<string, string> = {
  book: 'Livro',
  article: 'Artigo',
  report: 'Relatório',
  video: 'Vídeo',
  podcast: 'Podcast',
  internal_document: 'Doc. Interno',
  legislation: 'Legislação',
  other: 'Outro',
};

const rightsLabels: Record<string, string> = {
  public_domain: 'Domínio Público',
  creative_commons: 'Creative Commons',
  licensed: 'Licenciado',
  fair_use: 'Fair Use',
  proprietary: 'Proprietário',
  pending_review: 'Pendente',
};

export default async function SourcesPage() {
  const { sources, error } = await getSources();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Biblioteca de Fontes</h1>
        <Link
          href="/dashboard/sources/new"
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Nova Fonte
        </Link>
      </div>

      {error && (
        <div className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {!error && sources.length === 0 && (
        <div className="rounded border border-dashed border-gray-300 p-8 text-center text-gray-500">
          Nenhuma fonte cadastrada ainda. Adicione a primeira!
        </div>
      )}

      {sources.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Título
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Autor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Direitos
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {sources.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                    {s.title}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {sourceTypeLabels[s.source_type] ?? s.source_type}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {s.author ?? '—'}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {rightsLabels[s.rights_status] ?? s.rights_status}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold leading-5 ${
                        s.processing_status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : s.processing_status === 'failed'
                          ? 'bg-red-100 text-red-800'
                          : s.processing_status === 'needs_review'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {s.processing_status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}