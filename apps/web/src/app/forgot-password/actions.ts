'use server';

import { createClient } from '@/lib/supabase/server';

/**
 * Verifica se um email está cadastrado no Supabase auth.users.
 * Usa service role key para bypassar RLS e acessar auth.admin.
 * Retorna { exists: true } se encontrado, { exists: false } caso contrário.
 */
export async function checkEmailExists(email: string): Promise<{ exists: boolean; error?: string }> {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!serviceRoleKey || !supabaseUrl) {
    return { exists: false, error: 'Configuração de servidor incompleta (SUPABASE_SERVICE_ROLE_KEY).' };
  }

  // Usar fetch direto à Admin API do Supabase para listar usuários por email
  // Isso evita expor a service role key no client-side
  try {
    const response = await fetch(
      `${supabaseUrl}/auth/v1/admin/users?page=1&per_page=1&filter=email.eq.${encodeURIComponent(email)}`,
      {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      return { exists: false, error: `Erro ao verificar email (${response.status}).` };
    }

    const data = await response.json();
    const users = data.users ?? data;
    const exists = Array.isArray(users) && users.length > 0;

    return { exists };
  } catch (err) {
    return { exists: false, error: (err as Error).message };
  }
}

/**
 * Envia email de recuperação de senha via Supabase auth.
 * Deve ser chamado apenas após confirmar que o email existe.
 */
export async function sendPasswordResetEmail(
  email: string,
  redirectTo: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (error) {
    if (error.status === 429) {
      return { success: false, error: 'Muitas solicitações. Tente novamente em alguns minutos.' };
    }
    return { success: false, error: error.message };
  }

  return { success: true };
}