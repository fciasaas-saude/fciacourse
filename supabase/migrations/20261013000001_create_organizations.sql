-- Migration: 0001_create_organizations
-- Fase 1 — Fundação segura e isolada
-- Cria tabela de organizações (multi-tenant root)

CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    brand_config JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Trigger updated_at
CREATE OR REPLACE TRIGGER organizations_updated_at
    BEFORE UPDATE ON public.organizations
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- RLS: super_admin tem acesso total; membros leem própria org
DROP POLICY IF EXISTS "super_admin_full_access_organizations" ON public.organizations;
CREATE POLICY "super_admin_full_access_organizations"
    ON public.organizations
    FOR ALL
    USING (public.is_super_admin(auth.uid()))
    WITH CHECK (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "members_read_own_organization" ON public.organizations;
CREATE POLICY "members_read_own_organization"
    ON public.organizations
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.organization_members om
            WHERE om.organization_id = organizations.id
              AND om.user_id = auth.uid()
        )
    );

-- NOTA: Dados de teste (organizações fictícias) foram movidos para supabase/seed.sql
-- Esta migration contém APENAS schema estrutural. Nenhum dado é inserido automaticamente.