-- Migration: 0003_create_ai_jobs
-- Fase 1 — Fundação segura e isolada
-- Cria fila de jobs persistente em Postgres

CREATE TYPE public.job_status AS ENUM (
    'queued',
    'running',
    'retrying',
    'completed',
    'failed',
    'cancelled'
);

CREATE TABLE IF NOT EXISTS public.ai_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    job_type TEXT NOT NULL,
    status public.job_status NOT NULL DEFAULT 'queued',
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    result JSONB,
    checkpoint JSONB,
    idempotency_key TEXT NOT NULL UNIQUE,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    error_message TEXT,
    created_by UUID REFERENCES auth.users(id),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_jobs ENABLE ROW LEVEL SECURITY;

-- Índices para polling do worker e consultas por org
CREATE INDEX idx_ai_jobs_status_created ON public.ai_jobs(status, created_at)
    WHERE status IN ('queued', 'retrying');
CREATE INDEX idx_ai_jobs_org ON public.ai_jobs(organization_id);
CREATE INDEX idx_ai_jobs_idempotency ON public.ai_jobs(idempotency_key);

-- Trigger updated_at
CREATE OR REPLACE TRIGGER ai_jobs_updated_at
    BEFORE UPDATE ON public.ai_jobs
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- RLS: membros leem jobs da própria org; super_admin lê tudo; service_account gerencia
CREATE POLICY "members_view_own_org_jobs"
    ON public.ai_jobs FOR SELECT
    USING (
        public.is_member_of_org(auth.uid(), organization_id)
        OR public.is_super_admin(auth.uid())
    );

CREATE POLICY "super_admin_manage_all_jobs"
    ON public.ai_jobs FOR ALL
    USING (public.is_super_admin(auth.uid()))
    WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "service_account_manage_jobs"
    ON public.ai_jobs FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.organization_members om
            WHERE om.user_id = auth.uid()
              AND om.role = 'service_account'
              AND om.organization_id = ai_jobs.organization_id
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.organization_members om
            WHERE om.user_id = auth.uid()
              AND om.role = 'service_account'
              AND om.organization_id = ai_jobs.organization_id
        )
    );

CREATE POLICY "members_insert_own_org_jobs"
    ON public.ai_jobs FOR INSERT
    WITH CHECK (
        public.is_member_of_org(auth.uid(), organization_id)
        OR public.is_super_admin(auth.uid())
    );