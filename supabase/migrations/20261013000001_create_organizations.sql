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

-- NOTA: Todas as policies de organizations são criadas na migration 0002
-- após a criação das funções auxiliares (is_super_admin, is_member_of_org)
-- e da tabela organization_members. Nenhuma policy é definida aqui para
-- evitar dependência antecipada de objetos que ainda não existem.

-- NOTA: Dados de teste foram movidos para supabase/seed.sql
-- Esta migration contém APENAS schema estrutural. Nenhum dado é inserido automaticamente.