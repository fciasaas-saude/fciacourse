import { createClient } from '@/lib/supabase/server';

export default async function CertificatesPage() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return (
      <div className="rounded bg-red-50 p-4 text-sm text-red-700">
        Usuário não autenticado.
      </div>
    );
  }

  const { data: certificates, error } = await supabase
    .from('certificates')
    .select('*, course_architectures(title)')
    .eq('user_id', user.id)
    .order('issued_at', { ascending: false });

  if (error) {
    return (
      <div className="rounded bg-red-50 p-4 text-sm text-red-700">
        Erro ao carregar certificados: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Meus Certificados</h1>

      {!certificates || certificates.length === 0 ? (
        <div className="rounded border border-dashed border-gray-300 p-8 text-center text-gray-500">
          Nenhum certificado emitido ainda. Complete cursos e avaliações para receber seus certificados.
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {certificates.map((cert) => (
            <div
              key={cert.id}
              className="overflow-hidden rounded-lg border border-yellow-200 bg-gradient-to-br from-yellow-50 to-white shadow"
            >
              <div className="border-b border-yellow-200 bg-yellow-100 px-5 py-3">
                <h2 className="font-serif text-lg font-bold text-yellow-900">
                  Certificado de Conclusão
                </h2>
              </div>
              <div className="p-5 space-y-3">
                <div>
                  <span className="text-xs font-semibold uppercase text-gray-500">Curso</span>
                  <p className="text-sm font-medium text-gray-900">
                    {(cert.course_architectures as { title: string })?.title ?? 'Curso'}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-xs font-semibold uppercase text-gray-500">Nota Final</span>
                    <p className="text-sm font-bold text-green-700">{cert.final_score}%</p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold uppercase text-gray-500">Conclusão</span>
                    <p className="text-sm text-gray-900">
                      {new Date(cert.completion_date).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
                <div>
                  <span className="text-xs font-semibold uppercase text-gray-500">Código de Verificação</span>
                  <p className="mt-1 rounded bg-gray-100 px-2 py-1 font-mono text-xs text-gray-700 select-all">
                    {cert.verification_code}
                  </p>
                </div>
                {cert.expires_at && (
                  <p className="text-xs text-gray-400">
                    Válido até {new Date(cert.expires_at).toLocaleDateString('pt-BR')}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}