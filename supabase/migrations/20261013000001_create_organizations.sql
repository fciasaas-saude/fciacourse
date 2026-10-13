-- Migration: 0001_create_organizations
-- Fase 1 — Fundação segura e isolada
-- Cria tabela de organizações (multi-tenant root)
-- NOTA: Policy members_read_own_organization movida para 0002 (depende de organization_members)

CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    brand_config JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Trigger updated_at (depende de set_updated_at da migration 0000)
CREATE OR REPLACE TRIGGER organizations_updated_at
    BEFORE UPDATE ON public.organizations
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- RLS: super_admin tem acesso total
-- NOTA: Policy de leitura para membros será criada na migration 0002
-- após a criação da tabela organization_members e funções auxiliares
CREATE POLICY "super_admin_full_access_organizations"
    ON public.organizations
    FOR ALL
    USING (public.is_super_admin(auth.uid()))
    WITH CHECK (public.is_super_admin(auth.uid()));

-- NOTA: Dados de teste foram movidos para supabase/seed.sql
-- Esta migration contém APENAS schema estrutural. Nenhum dado é inserido automaticamente.