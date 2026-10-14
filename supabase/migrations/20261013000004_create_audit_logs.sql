-- Migration: 0004_create_audit_logs
-- Fase 1 — Tabela de auditoria append-only
-- DEPENDÊNCIA: set_updated_at() já existe via 0000; is_super_admin/is_member_of_org via 0002
-- NOTA: Esta tabela é estritamente append-only. NÃO há trigger set_updated_at.
-- NOTA: NÃO existem políticas de UPDATE ou DELETE para papéis comuns.

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    metadata JSONB DEFAULT '{}'::jsonb,
    ip_address INET,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Índices para consultas por org e por entidade (idempotente)
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_created ON public.audit_logs(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs(user_id, created_at DESC);

-- =============================================================================
-- RLS: APENAS SELECT e INSERT para papéis comuns
-- super_admin tem gestão excepcional via policy separada
-- =============================================================================

-- super_admin lê tudo
DROP POLICY IF EXISTS "super_admin_view_all_audit_logs" ON public.audit_logs;
CREATE POLICY "super_admin_view_all_audit_logs"
    ON public.audit_logs FOR SELECT
    USING (public.is_super_admin(auth.uid()));

-- Membros leem logs da própria org
DROP POLICY IF EXISTS "members_view_own_org_audit_logs" ON public.audit_logs;
CREATE POLICY "members_view_own_org_audit_logs"
    ON public.audit_logs FOR SELECT
    USING (public.is_member_of_org(auth.uid(), organization_id));

-- service_account insere logs na própria org
DROP POLICY IF EXISTS "service_account_insert_audit_logs" ON public.audit_logs;
CREATE POLICY "service_account_insert_audit_logs"
    ON public.audit_logs FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.organization_members om
            WHERE om.user_id = auth.uid()
              AND om.role = 'service_account'
              AND om.organization_id = audit_logs.organization_id
        )
        OR public.is_super_admin(auth.uid())
    );

-- Membros podem inserir logs na própria org (ações do usuário)
DROP POLICY IF EXISTS "members_insert_own_org_audit_logs" ON public.audit_logs;
CREATE POLICY "members_insert_own_org_audit_logs"
    ON public.audit_logs FOR INSERT
    WITH CHECK (public.is_member_of_org(auth.uid(), organization_id));

-- super_admin pode gerenciar registros excepcionais se necessário
DROP POLICY IF EXISTS "super_admin_manage_audit_logs" ON public.audit_logs;
CREATE POLICY "super_admin_manage_audit_logs"
    ON public.audit_logs FOR ALL
    USING (public.is_super_admin(auth.uid()))
    WITH CHECK (public.is_super_admin(auth.uid()));