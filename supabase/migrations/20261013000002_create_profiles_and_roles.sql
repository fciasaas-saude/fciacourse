-- Migration: 0002_create_profiles_and_roles
-- Fase 1 — Fundação segura e isolada
-- Cria perfis, papéis multi-tenant e funções auxiliares de RLS
-- DEPENDÊNCIA: set_updated_at() já existe via 20261013000000_create_utilities.sql

-- Enum de papéis do Course Engine
CREATE TYPE public.app_role AS ENUM (
    'super_admin',
    'content_director',
    'editor',
    'researcher',
    'client_admin',
    'client_reviewer',
    'student',
    'service_account'
);

-- Perfis vinculados ao auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Membros de organizações (multi-tenant)
CREATE TABLE IF NOT EXISTS public.organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    role public.app_role NOT NULL,
    invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    joined_at TIMESTAMPTZ,
    UNIQUE (user_id, organization_id)
);
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- Trigger updated_at para profiles
CREATE OR REPLACE TRIGGER profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- Funções auxiliares SECURITY DEFINER (search_path fixo = public)
-- =============================================================================

-- Verificar se usuário é super_admin em alguma org
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.user_id = _user_id AND om.role = 'super_admin'
    );
$$;
COMMENT ON FUNCTION public.is_super_admin(UUID) IS
'SECURITY DEFINER helper: checks if user holds super_admin role in any organization. Fixed search_path = public. Used in RLS policies.';

-- Verificar papel específico em uma org
CREATE OR REPLACE FUNCTION public.has_role_in_org(_user_id UUID, _org_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.user_id = _user_id
          AND om.organization_id = _org_id
          AND om.role = _role
    );
$$;
COMMENT ON FUNCTION public.has_role_in_org(UUID, UUID, public.app_role) IS
'SECURITY DEFINER helper: checks if user has a specific role in a specific organization. Fixed search_path = public. Used in RLS policies.';

-- Verificar qualquer papel em uma org (membership geral)
CREATE OR REPLACE FUNCTION public.is_member_of_org(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.user_id = _user_id
          AND om.organization_id = _org_id
    );
$$;
COMMENT ON FUNCTION public.is_member_of_org(UUID, UUID) IS
'SECURITY DEFINER helper: checks if user is a member of a specific organization (any role). Fixed search_path = public. Used in RLS policies.';

-- Auto-criar profile no signup (trigger function)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, display_name)
    VALUES (new.id, COALESCE(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
    RETURN new;
END;
$$;
COMMENT ON FUNCTION public.handle_new_user() IS
'SECURITY DEFINER trigger: auto-creates a public.profile row when a new auth.users row is inserted. Fixed search_path = public. Does NOT create organization_members.';

-- Revogar execução pública das funções SECURITY DEFINER
REVOKE EXECUTE ON FUNCTION public.is_super_admin(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_super_admin(UUID) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.has_role_in_org(UUID, UUID, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role_in_org(UUID, UUID, public.app_role) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_member_of_org(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_member_of_org(UUID, UUID) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;

-- =============================================================================
-- RLS: profiles
-- =============================================================================
CREATE POLICY "users_view_own_profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "users_update_own_profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "super_admin_view_all_profiles"
    ON public.profiles FOR SELECT
    USING (public.is_super_admin(auth.uid()));

-- =============================================================================
-- RLS: organization_members
-- REGRA CRÍTICA: usuários comuns NÃO podem criar sua própria membership.
-- Apenas super_admin ou service_account pode inserir em organization_members.
-- =============================================================================

-- Leitura: membros veem outros membros da própria org; super_admin vê tudo
CREATE POLICY "members_view_own_org_members"
    ON public.organization_members FOR SELECT
    USING (
        public.is_member_of_org(auth.uid(), organization_id)
        OR public.is_super_admin(auth.uid())
    );

-- Inserção: APENAS super_admin ou service_account (NÃO o próprio usuário)
CREATE POLICY "super_admin_insert_org_members"
    ON public.organization_members FOR INSERT
    WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "service_account_insert_org_members"
    ON public.organization_members FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.organization_members om
            WHERE om.user_id = auth.uid()
              AND om.role = 'service_account'
              AND om.organization_id = organization_members.organization_id
        )
    );

-- Atualização: APENAS super_admin (nenhum usuário pode se promover)
CREATE POLICY "super_admin_update_org_members"
    ON public.organization_members FOR UPDATE
    USING (public.is_super_admin(auth.uid()))
    WITH CHECK (public.is_super_admin(auth.uid()));

-- Deleção: APENAS super_admin
CREATE POLICY "super_admin_delete_org_members"
    ON public.organization_members FOR DELETE
    USING (public.is_super_admin(auth.uid()));

-- Trigger on_auth_user_created (reaproveita handle_new_user)
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();