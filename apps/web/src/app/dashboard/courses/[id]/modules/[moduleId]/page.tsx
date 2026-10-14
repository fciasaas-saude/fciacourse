import { getModuleWithVersion } from '../actions';
import { notFound } from 'next/navigation';
import type { ContentBlock } from '@/types/module';

export default async function ModuleDetailPage({
  params,
}: {
  params: { id: string; moduleId: string };
}) {
  const { module: mod, version, error } = await getModuleWithVersion(params.moduleId);

  if (error) {
    return (
      <div className="rounded bg-red-50 p-4 text-sm text-red-700">
        Erro ao carregar módulo: {error}
      </div>
    );
  }

  if (!mod) {
    notFound();
  }

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-800',
    review: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    archived: 'bg-red-100 text-red-800',
    rejected: 'bg-red-100 text-red-800',
  };

  const content = version?.content_jsonb;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="rounded bg-blue-100 px-2 py-1 text-xs font-bold text-blue-800">
              Módulo {mod.module_number}
            </span>
            <h1 className="text-3xl font-bold text-gray-900">{mod.title}</h1>
          </div>
          {mod.description && (
            <p className="mt-2 text-lg text-gray-600">{mod.description}</p>
          )}
          <p className="mt-1 text-sm text-gray-500">
            Objetivo: {mod.learning_objective}
          </p>
        </div>
        <span
          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
            statusColors[mod.status] ?? 'bg-gray-100 text-gray-800'
          }`}
        >
          {mod.status}
        </span>
      </div>

      {/* Metadata */}
      <div className="flex gap-6 border-b border-gray-200 pb-4 text-sm text-gray-500">
        {mod.estimated_duration_minutes && (
          <span>Duração: {mod.estimated_duration_minutes} min</span>
        )}
        {version && (
          <>
            <span>Versão {version.version}</span>
            {version.quality_score != null && (
              <span>Qualidade: {version.quality_score}/100</span>
            )}
            {version.originality_score != null && (
              <span>Originalidade: {version.originality_score}/100</span>
            )}
          </>
        )}
      </div>

      {!version && (
        <div className="rounded border border-dashed border-gray-300 p-8 text-center text-gray-500">
          Nenhuma versão de conteúdo gerada ainda.
        </div>
      )}

      {content && (
        <>
          {/* Introduction */}
          {content.introduction && (
            <section className="rounded-lg border border-blue-200 bg-blue-50 p-6">
              <h2 className="mb-3 text-lg font-semibold text-blue-900">Introdução</h2>
              <p className="text-blue-950 whitespace-pre-line">{content.introduction}</p>
            </section>
          )}

          {/* Content Blocks */}
          <section className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Conteúdo</h2>
            {content.blocks.map((block: ContentBlock, idx: number) => (
              <div key={idx} className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                <div className="border-b border-gray-100 bg-gray-50 px-5 py-3">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-indigo-100 px-2 py-0.5 text-[10px] font-bold uppercase text-indigo-700">
                      {block.type.replace('_', ' ')}
                    </span>
                    <h3 className="font-semibold text-gray-900">{block.title}</h3>
                  </div>
                </div>
                <div className="p-5">
                  {block.type === 'theory' && (
                    <div>
                      <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-line">
                        {block.content}
                      </div>
                      {block.key_points && block.key_points.length > 0 && (
                        <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-gray-600">
                          {block.key_points.map((point, i) => (
                            <li key={i}>{point}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  {block.type === 'example' && (
                    <div className="space-y-3">
                      <div>
                        <span className="text-xs font-semibold uppercase text-gray-500">Cenário:</span>
                        <p className="mt-1 text-sm text-gray-800">{block.scenario}</p>
                      </div>
                      {block.solution && (
                        <div>
                          <span className="text-xs font-semibold uppercase text-gray-500">Solução:</span>
                          <p className="mt-1 text-sm text-gray-800">{block.solution}</p>
                        </div>
                      )}
                      {block.analysis && (
                        <div className="rounded bg-green-50 p-3 text-sm text-green-900">
                          <span className="font-semibold">Análise:</span> {block.analysis}
                        </div>
                      )}
                    </div>
                  )}

                  {block.type === 'activity' && (
                    <div className="space-y-3">
                      <p className="text-sm text-gray-800">{block.instructions}</p>
                      {block.expected_output && (
                        <div className="rounded bg-yellow-50 p-3 text-sm text-yellow-900">
                          <span className="font-semibold">Resultado esperado:</span> {block.expected_output}
                        </div>
                      )}
                      {block.duration_minutes && (
                        <p className="text-xs text-gray-500">Duração estimada: {block.duration_minutes} min</p>
                      )}
                    </div>
                  )}

                  {block.type === 'common_mistake' && (
                    <div className="space-y-3">
                      <div className="rounded bg-red-50 p-3 text-sm text-red-900">
                        <span className="font-semibold">Erro:</span> {block.mistake}
                      </div>
                      <div className="rounded bg-green-50 p-3 text-sm text-green-900">
                        <span className="font-semibold">Correção:</span> {block.correction}
                      </div>
                      {block.prevention_tip && (
                        <p className="text-xs text-gray-500">💡 {block.prevention_tip}</p>
                      )}
                    </div>
                  )}

                  {block.type === 'checklist' && (
                    <ul className="space-y-2">
                      {block.items.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-800">
                          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border border-gray-300 text-xs">
                            {i + 1}
                          </span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  )}

                  {block.type === 'quiz' && (
                    <div className="space-y-4">
                      {block.questions.map((q, qIdx) => (
                        <div key={q.id} className="rounded border border-gray-200 p-4">
                          <p className="mb-2 text-sm font-medium text-gray-900">
                            {qIdx + 1}. {q.question}
                          </p>
                          <ul className="space-y-1">
                            {q.options.map((opt, oIdx) => (
                              <li
                                key={oIdx}
                                className={`text-sm ${
                                  oIdx === q.correct_answer_index
                                    ? 'font-semibold text-green-700'
                                    : 'text-gray-600'
                                }`}
                              >
                                {String.fromCharCode(65 + oIdx)}. {opt}
                                {oIdx === q.correct_answer_index && ' ✓'}
                              </li>
                            ))}
                          </ul>
                          {q.explanation && (
                            <p className="mt-2 text-xs text-gray-500 italic">{q.explanation}</p>
                          )}
                        </div>
                      ))}
                      {block.passing_score != null && (
                        <p className="text-xs text-gray-500">
                          Nota mínima para aprovação: {block.passing_score}%
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </section>

          {/* Summary */}
          {content.summary && (
            <section className="rounded-lg border border-green-200 bg-green-50 p-6">
              <h2 className="mb-3 text-lg font-semibold text-green-900">Resumo do Módulo</h2>
              <p className="text-green-950 whitespace-pre-line">{content.summary}</p>
            </section>
          )}
        </>
      )}

      {/* Footer metadata */}
      <div className="border-t border-gray-200 pt-4 text-xs text-gray-400">
        Criado em {new Date(mod.created_at).toLocaleDateString('pt-BR')}
        {version?.generation_metadata?.model_name &&
          ` · Gerado por ${version.generation_metadata.model_name}`}
      </div>
    </div>
  );
}