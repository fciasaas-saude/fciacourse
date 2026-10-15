import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { isSuperAdmin, SUPER_ADMIN_EMAIL } from '@/lib/admin';
import Link from 'next/link';

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const isAdmin = await isSuperAdmin(user.id, user.email ?? undefined);

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="rounded-lg bg-white p-8 shadow text-center">
          <h1 className="text-2xl font-bold text-red-600">Acesso Negado</h1>
          <p className="mt-2 text-gray-600">
            Esta área é restrita ao Super Admin Master ({SUPER_ADMIN_EMAIL}).
          </p>
          <Link href="/dashboard" className="mt-4 inline-block text-blue-600 hover:underline">
            Voltar ao Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Buscar estatísticas rápidas
  const { count: totalVouchers } = await supabase
    .from('vouchers')
    .select('*', { count: 'exact', head: true });

  const { count: totalUsers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true });

  const { count: totalCourses } = await supabase
    .from('course_architectures')
    .select('*', { count: 'exact', head: true });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Painel do Super Admin</h1>
            <p className="mt-1 text-sm text-gray-600">
              Bem-vindo, Admin Master. Controle total da plataforma FCIA Course Engine.
            </p>
          </div>
          <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-800">
            SUPER ADMIN
          </span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="text-sm font-medium text-gray-500">Total de Vouchers</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">{totalVouchers ?? 0}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="text-sm font-medium text-gray-500">Usuários Cadastrados</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">{totalUsers ?? 0}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="text-sm font-medium text-gray-500">Cursos Ativos</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">{totalCourses ?? 0}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <section>
        <h2 className="mb-4 text-xl font-semibold text-gray-900">Gestão da Plataforma</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/dashboard/admin/vouchers"
            className="rounded-lg border border-gray-200 bg-white p-6 hover:border-blue-500 hover:shadow-md transition"
          >
            <h3 className="font-semibold text-gray-900">Gerenciar Vouchers</h3>
            <p className="mt-1 text-sm text-gray-600">
              Gerar lotes, ativar/desativar códigos e monitorar uso
            </p>
          </Link>

          <Link
            href="/dashboard/sources"
            className="rounded-lg border border-gray-200 bg-white p-6 hover:border-blue-500 hover:shadow-md transition"
          >
            <h3 className="font-semibold text-gray-900">Biblioteca de Fontes</h3>
            <p className="mt-1 text-sm text-gray-600">
              Sincronizar livros do Drive e gerenciar knowledge cards
            </p>
          </Link>

          <Link
            href="/dashboard/briefings"
            className="rounded-lg border border-gray-200 bg-white p-6 hover:border-blue-500 hover:shadow-md transition"
          >
            <h3 className="font-semibold text-gray-900">Briefings Pedagógicos</h3>
            <p className="mt-1 text-sm text-gray-600">
              Criar e aprovar briefings para geração de cursos
            </p>
          </Link>
        </div>
      </section>

      {/* Student Experience Toggle */}
      <section>
        <h2 className="mb-4 text-xl font-semibold text-gray-900">Experiência de Aluno</h2>
        <div className="rounded-lg border border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50 p-6">
          <p className="text-sm text-gray-700 mb-4">
            Como Super Admin, você pode acessar a plataforma como aluno para testar cursos e validar a experiência do usuário.
          </p>
          <Link
            href="/dashboard"
            className="inline-block rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Acessar Dashboard de Aluno
          </Link>
        </div>
      </section>

      {/* System Info */}
      <section className="rounded-lg border border-gray-200 bg-gray-50 p-6">
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Informações do Sistema</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-gray-600">Email do Admin Master:</dt>
            <dd className="font-mono text-gray-900">{SUPER_ADMIN_EMAIL}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-600">User ID:</dt>
            <dd className="font-mono text-xs text-gray-900">{user.id}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-600">Último acesso:</dt>
            <dd className="text-gray-900">{new Date().toLocaleString('pt-BR')}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}