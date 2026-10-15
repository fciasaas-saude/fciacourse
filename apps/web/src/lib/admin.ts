// Utilitários de administração e verificação de Super Admin
// Email definitivo do Admin Master
export const SUPER_ADMIN_EMAIL = 'fciaoficial@gmail.com';

/**
 * Verifica se o usuário atual é o Super Admin Master
 * Usa tanto verificação por email quanto por role no banco
 */
export async function isSuperAdmin(userId: string, userEmail?: string): Promise<boolean> {
  // Verificação rápida por email (bypass para o admin master definitivo)
  if (userEmail === SUPER_ADMIN_EMAIL) {
    return true;
  }

  // Verificação via banco de dados (role-based)
  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();

  const { data: membership } = await supabase
    .from('organization_members')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'super_admin')
    .single();

  return !!membership;
}

/**
 * Garante acesso de super admin - lança erro se não for admin
 */
export async function requireSuperAdmin(userId: string, userEmail?: string): Promise<void> {
  const isAdmin = await isSuperAdmin(userId, userEmail);
  if (!isAdmin) {
    throw new Error('Acesso negado: privilégios de Super Admin necessários.');
  }
}

/**
 * Retorna informações do perfil admin para exibição no dashboard
 */
export async function getAdminProfile(userId: string) {
  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, organization_members(role, organization_id, organizations(name))')
    .eq('id', userId)
    .single();

  return profile;
}