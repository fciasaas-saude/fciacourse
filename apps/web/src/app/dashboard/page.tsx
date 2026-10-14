import { redirect } from 'next/navigation';

interface Profile {
  id: string;
  display_name: string | null;
}

interface Membership {
  role: string;
  organizations: {
    name: string;
    slug: string;
  }[] | null;
}

export function generateStaticParams() {
  return [];
}

export default async function DashboardPage() {
  let supabase;
  try {
    const { createClient } = await import('@/lib/supabase/server');
    supabase = await createClient();
  } catch {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-600">
          Ambiente não configurado. Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.
        </p>
      </div>
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, display_name')
    .eq('id', user.id)
    .single<Profile>();

  const { data: memberships } = await supabase
    .from('organization_members')
    .select('role, organizations(name, slug)')
    .eq('user_id', user.id);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">FCIA Course Engine</h1>
          <form action="/auth/logout" method="POST">
            <button
              type="submit"
              className="rounded border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Sair
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-12">
        <div className="space-y-8">
          <section className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Seu Perfil</h2>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="mt-1 text-gray-900">{user.email}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Nome de exibição</dt>
                <dd className="mt-1 text-gray-900">
                  {profile?.display_name ?? 'Não definido'}
                </dd>
              </div>
            </dl>
          </section>
          <section className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Organizações</h2>
            {!memberships || memberships.length === 0 ? (
              <p className="text-sm text-gray-600">
                Sua conta ainda não está vinculada a uma organização.
              </p>
            ) : (
              <ul className="divide-y divide-gray-200">
                {memberships.map((m: Membership, idx: number) => (
                  <li key={idx} className="py-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900">
                        {m.organizations?.[0]?.name ?? 'Organização desconhecida'}
                      </span>
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                        {m.role}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}