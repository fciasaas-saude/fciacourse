-- Migration: 0004_create_audit_logs
-- Fase 1 — Tabela de auditoria ESTRITAMENTE IMUTÁVEL
-- DEPENDÊNCIA: is_super_admin/is_member_of_org via 0002
-- NOTA: Esta tabela é IMUTÁVEL para TODOS os papéis, inclusive super_admin.
-- NÃO existem policies de UPDATE ou DELETE. Correções são registradas como nova entrada.
-- NOTA: NÃO há trigger set_updated_at (tabela não possui coluna updated_at).

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

-- Índices para consultas por org e por entidade
CREATE INDEX idx_audit_logs_org_created ON public.audit_logs(organization_id, created_at DESC);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_user ON public.audit_logs(user_id, created_at DESC);

-- =============================================================================
-- RLS: APENAS SELECT e INSERT. SEM UPDATE OU DELETE PARA NENHUM PAPEL.
-- =============================================================================

-- super_admin lê todos os logs
CREATE POLICY "super_admin_view_all_audit_logs"
    ON public.audit_logs FOR SELECT
    USING (public.is_super_admin(auth.uid()));

-- Membros leem logs da própria organização
CREATE POLICY "members_view_own_org_audit_logs"
    ON public.audit_logs FOR SELECT
    USING (public.is_member_of_org(auth.uid(), organization_id));

-- service_account insere logs na própria organização
CREATE POLICY "service_account_insert_audit_logs"
    ON public.audit_logs FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.organization_members om
            WHERE om.user_id = auth.uid()
              AND om.role = 'service_account'
              AND om.organization_id = audit_logs.organization_id
        )
    );

-- super_admin pode inserir logs quando necessário (ex: bootstrap, correções manuais)
CREATE POLICY "super_admin_insert_audit_logs"
    ON public.audit_logs FOR INSERT
    WITH CHECK (public.is_super_admin(auth.uid()));

-- NOTA: NÃO existem policies de UPDATE ou DELETE.
-- A tabela é estritamente imutável por design.
-- Membros comuns NÃO podem inserir logs diretamente (apenas via service_account ou super_admin).
-- Correções ou retratações devem ser registradas como NOVA entrada de auditoria com action apropriada.