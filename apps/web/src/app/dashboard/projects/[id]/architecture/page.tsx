import { getArchitecture } from './actions';
import { notFound } from 'next/navigation';

export default async function ArchitecturePage({
  params,
}: {
  params: { id: string };
}) {
  const { architecture, error } = await getArchitecture(params.id);

  if (error) {
    return (
      <div className="rounded bg-red-50 p-4 text-sm text-red-700">
        Erro ao carregar arquitetura: {error}
      </div>
    );
  }

  if (!architecture) {
    notFound();
  }

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-800',
    review: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    archived: 'bg-red-100 text-red-800',
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{architecture.title}</h1>
          {architecture.subtitle && (
            <p className="mt-1 text-lg text-gray-600">{architecture.subtitle}</p>
          )}
        </div>
        <span
          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
            statusColors[architecture.status] ?? 'bg-gray-100 text-gray-800'
          }`}
        >
          {architecture.status}
        </span>
      </div>

      {/* Promise & Audience */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-5">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-blue-900">
            Promessa do Curso
          </h2>
          <p className="text-base text-blue-950">{architecture.promise}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-700">
            Público-Alvo
          </h2>
          <p className="text-base text-gray-900">{architecture.target_audience}</p>
          {architecture.estimated_duration_minutes && (
            <p className="mt-3 text-sm text-gray-500">
              Duração estimada:{' '}
              <span className="font-medium text-gray-900">
                {Math.floor(architecture.estimated_duration_minutes / 60)}h{' '}
                {architecture.estimated_duration_minutes % 60}min
              </span>
            </p>
          )}
        </div>
      </div>

      {/* Learning Outcomes */}
      <section>
        <h2 className="mb-4 text-xl font-semibold text-gray-900">Resultados de Aprendizagem</h2>
        <ul className="space-y-3">
          {(architecture.learning_outcomes as Array<{ description: string; bloom_level?: string; assessment_method?: string }>).map(
            (outcome, idx) => (
              <li
                key={idx}
                className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-4"
              >
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                  {idx + 1}
                </span>
                <div>
                  <p className="text-sm text-gray-900">{outcome.description}</p>
                  <div className="mt-1 flex gap-2">
                    {outcome.bloom_level && (
                      <span className="rounded bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                        Bloom: {outcome.bloom_level}
                      </span>
                    )}
                    {outcome.assessment_method && (
                      <span className="rounded bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-700">
                        Avaliação: {outcome.assessment_method}
                      </span>
                    )}
                  </div>
                </div>
              </li>
            )
          )}
        </ul>
      </section>

      {/* Module Structure */}
      <section>
        <h2 className="mb-4 text-xl font-semibold text-gray-900">Estrutura Modular</h2>
        <div className="space-y-4">
          {(architecture.structure_json as Array<{
            title: string;
            description?: string;
            duration_minutes?: number;
            activities?: Array<{ type: string; title: string; duration_minutes?: number }>;
          }>).map((mod, idx) => (
            <div key={idx} className="overflow-hidden rounded-lg border border-gray-200 bg-white">
              <div className="border-b border-gray-100 bg-gray-50 px-5 py-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">{mod.title}</h3>
                  {mod.duration_minutes && (
                    <span className="text-xs text-gray-500">{mod.duration_minutes} min</span>
                  )}
                </div>
                {mod.description && (
                  <p className="mt-1 text-sm text-gray-600">{mod.description}</p>
                )}
              </div>
              {mod.activities && mod.activities.length > 0 && (
                <ul className="divide-y divide-gray-100">
                  {mod.activities.map((activity, aIdx) => (
                    <li key={aIdx} className="flex items-center justify-between px-5 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-gray-600">
                          {activity.type}
                        </span>
                        <span className="text-sm text-gray-800">{activity.title}</span>
                      </div>
                      {activity.duration_minutes && (
                        <span className="text-xs text-gray-400">{activity.duration_minutes} min</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Final Assessment */}
      <section>
        <h2 className="mb-4 text-xl font-semibold text-gray-900">Avaliação Final</h2>
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="rounded bg-orange-100 px-2 py-0.5 text-xs font-bold uppercase text-orange-700">
              {(architecture.final_assessment as { type: string }).type}
            </span>
            {(architecture.final_assessment as { passing_score?: number }).passing_score != null && (
              <span className="text-sm text-gray-500">
                Nota mínima:{' '}
                <span className="font-medium text-gray-900">
                  {(architecture.final_assessment as { passing_score?: number }).passing_score}%
                </span>
              </span>
            )}
          </div>
          <p className="mb-4 text-sm text-gray-900">
            {(architecture.final_assessment as { description: string }).description}
          </p>
          {(architecture.final_assessment as { criteria: Array<{ name: string; weight: number }> }).criteria && (
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Critérios
              </h4>
              <div className="space-y-2">
                {(architecture.final_assessment as { criteria: Array<{ name: string; weight: number }> }).criteria.map(
                  (criterion, cIdx) => (
                    <div key={cIdx} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">{criterion.name}</span>
                      <span className="font-medium text-gray-900">{criterion.weight}%</span>
                    </div>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Metadata */}
      <div className="border-t border-gray-200 pt-4 text-xs text-gray-400">
        Versão {architecture.version} · Criado em{' '}
        {new Date(architecture.created_at).toLocaleDateString('pt-BR')}
        {architecture.approved_at &&
          ` · Aprovado em ${new Date(architecture.approved_at).toLocaleDateString('pt-BR')}`}
      </div>
    </div>
  );
}