-- Migration: 20261014000002_create_course_architectures
-- Fase 3 — Course Architect (Arquitetura Pedagógica)
-- DEPENDÊNCIAS: course_projects (20261014000001), organizations, profiles, set_updated_at()

-- =============================================================================
-- COURSE ARCHITECTURES
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.course_architectures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_project_id UUID NOT NULL REFERENCES public.course_projects(id) ON DELETE CASCADE,
    version INTEGER NOT NULL DEFAULT 1,
    title TEXT NOT NULL,
    subtitle TEXT,
    promise TEXT NOT NULL,
    target_audience TEXT NOT NULL,
    learning_outcomes JSONB NOT NULL DEFAULT '[]'::jsonb,
    course_format TEXT NOT NULL DEFAULT 'online',
    estimated_duration_minutes INTEGER CHECK (estimated_duration_minutes > 0),
    final_assessment JSONB NOT NULL DEFAULT '{}'::jsonb,
    structure_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'approved', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES auth.users(id),
    UNIQUE (course_project_id, version)
);

ALTER TABLE public.course_architectures ENABLE ROW LEVEL SECURITY;

-- Índices otimizados
CREATE INDEX idx_course_architectures_project ON public.course_architectures(course_project_id);
CREATE INDEX idx_course_architectures_status ON public.course_architectures(status);
CREATE INDEX idx_course_architectures_version ON public.course_architectures(course_project_id, version DESC);

-- Trigger updated_at
CREATE OR REPLACE TRIGGER course_architectures_updated_at
BEFORE UPDATE ON public.course_architectures
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- RLS: Isolamento multi-tenant via join com course_projects → organizations
-- =============================================================================

-- Membros leem arquiteturas de projetos da própria org
DROP POLICY IF EXISTS "members_view_own_org_architectures" ON public.course_architectures;
CREATE POLICY "members_view_own_org_architectures"
ON public.course_architectures FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.course_projects cp
        WHERE cp.id = course_architectures.course_project_id
        AND (
            public.is_member_of_org(auth.uid(), cp.organization_id)
            OR public.is_super_admin(auth.uid())
        )
    )
);

-- Content roles podem inserir arquiteturas na própria org
DROP POLICY IF EXISTS "content_roles_insert_architectures" ON public.course_architectures;
CREATE POLICY "content_roles_insert_architectures"
ON public.course_architectures FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.course_projects cp
        WHERE cp.id = course_architectures.course_project_id
        AND (
            public.has_role_in_org(auth.uid(), cp.organization_id, 'content_director')
            OR public.has_role_in_org(auth.uid(), cp.organization_id, 'editor')
            OR public.is_super_admin(auth.uid())
        )
    )
);

-- Content roles podem atualizar arquiteturas na própria org
DROP POLICY IF EXISTS "content_roles_update_architectures" ON public.course_architectures;
CREATE POLICY "content_roles_update_architectures"
ON public.course_architectures FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.course_projects cp
        WHERE cp.id = course_architectures.course_project_id
        AND (
            public.has_role_in_org(auth.uid(), cp.organization_id, 'content_director')
            OR public.has_role_in_org(auth.uid(), cp.organization_id, 'editor')
            OR public.is_super_admin(auth.uid())
        )
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.course_projects cp
        WHERE cp.id = course_architectures.course_project_id
        AND (
            public.has_role_in_org(auth.uid(), cp.organization_id, 'content_director')
            OR public.has_role_in_org(auth.uid(), cp.organization_id, 'editor')
            OR public.is_super_admin(auth.uid())
        )
    )
);

-- super_admin tem acesso total
DROP POLICY IF EXISTS "super_admin_full_access_architectures" ON public.course_architectures;
CREATE POLICY "super_admin_full_access_architectures"
ON public.course_architectures FOR ALL
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

-- service_account pode gerenciar arquiteturas (para geração automática)
DROP POLICY IF EXISTS "service_account_manage_architectures" ON public.course_architectures;
CREATE POLICY "service_account_manage_architectures"
ON public.course_architectures FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.course_projects cp
        JOIN public.organization_members om ON om.organization_id = cp.organization_id
        WHERE cp.id = course_architectures.course_project_id
        AND om.user_id = auth.uid()
        AND om.role = 'service_account'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.course_projects cp
        JOIN public.organization_members om ON om.organization_id = cp.organization_id
        WHERE cp.id = course_architectures.course_project_id
        AND om.user_id = auth.uid()
        AND om.role = 'service_account'
    )
);