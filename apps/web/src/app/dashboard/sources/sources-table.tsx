import { FileText, ExternalLink } from 'lucide-react'

interface Source {
  id: string
  title: string
  source_type: string
  processing_status: string
  rights_status: string
  coverage_percent: number | null
  created_at: string
  metadata?: any
}

interface SourcesTableProps {
  sources: Source[]
}

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
}

const rightsColors = {
  pending_review: 'bg-orange-100 text-orange-800',
  fair_use: 'bg-purple-100 text-purple-800',
  licensed: 'bg-indigo-100 text-indigo-800',
  public_domain: 'bg-gray-100 text-gray-800',
}

export function SourcesTable({ sources }: SourcesTableProps) {
  if (sources.length === 0) {
    return (
      <div className="rounded-lg border bg-white p-12 text-center shadow-sm">
        <FileText className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-4 text-lg font-medium text-gray-900">Nenhuma fonte encontrada</h3>
        <p className="mt-2 text-gray-500">Sincronize seu Google Drive para começar a indexar documentos.</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Documento</th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Tipo</th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Direitos</th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Cobertura</th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Data</th>
            <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {sources.map((source) => (
            <tr key={source.id} className="hover:bg-gray-50">
              <td className="whitespace-nowrap px-6 py-4">
                <div className="flex items-center">
                  <FileText className="mr-3 h-5 w-5 text-gray-400" />
                  <div className="text-sm font-medium text-gray-900">{source.title}</div>
                </div>
              </td>
              <td className="whitespace-nowrap px-6 py-4">
                <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                  {source.source_type}
                </span>
              </td>
              <td className="whitespace-nowrap px-6 py-4">
                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[source.processing_status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}`}>
                  {source.processing_status}
                </span>
              </td>
              <td className="whitespace-nowrap px-6 py-4">
                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${rightsColors[source.rights_status as keyof typeof rightsColors] || 'bg-gray-100 text-gray-800'}`}>
                  {source.rights_status}
                </span>
              </td>
              <td className="whitespace-nowrap px-6 py-4">
                <div className="w-24">
                  <div className="h-2 w-full rounded-full bg-gray-200">
                    <div
                      className="h-2 rounded-full bg-blue-600"
                      style={{ width: `${source.coverage_percent || 0}%` }}
                    />
                  </div>
                  <span className="mt-1 text-xs text-gray-500">{source.coverage_percent || 0}%</span>
                </div>
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                {new Date(source.created_at).toLocaleDateString('pt-BR')}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                {source.metadata?.drive_metadata && (
                  <a
                    href={`https://drive.google.com/file/d/${source.metadata.drive_metadata.id}/view`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-900"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}