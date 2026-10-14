-- Migration: 20261014000003_create_modules_and_versions
-- Fase 3 — Module Factory (Produção de Módulos)
-- DEPENDÊNCIAS: course_architectures (20261014000002), course_projects, organizations, set_updated_at()

-- =============================================================================
-- COURSE MODULES
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.course_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES public.course_architectures(id) ON DELETE CASCADE,
    module_number INTEGER NOT NULL CHECK (module_number > 0),
    title TEXT NOT NULL,
    description TEXT,
    learning_objective TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'approved', 'archived')),
    estimated_duration_minutes INTEGER CHECK (estimated_duration_minutes > 0),
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (course_id, module_number)
);

ALTER TABLE public.course_modules ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_course_modules_course ON public.course_modules(course_id);
CREATE INDEX idx_course_modules_status ON public.course_modules(status);
CREATE INDEX idx_course_modules_sort ON public.course_modules(course_id, sort_order);

CREATE OR REPLACE TRIGGER course_modules_updated_at
BEFORE UPDATE ON public.course_modules
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- RLS: membros leem módulos de cursos da própria org (via join course_architectures → course_projects)
DROP POLICY IF EXISTS "members_view_own_org_modules" ON public.course_modules;
CREATE POLICY "members_view_own_org_modules"
ON public.course_modules FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.course_architectures ca
        JOIN public.course_projects cp ON cp.id = ca.course_project_id
        WHERE ca.id = course_modules.course_id
        AND (
            public.is_member_of_org(auth.uid(), cp.organization_id)
            OR public.is_super_admin(auth.uid())
        )
    )
);

-- Content roles podem inserir módulos na própria org
DROP POLICY IF EXISTS "content_roles_insert_modules" ON public.course_modules;
CREATE POLICY "content_roles_insert_modules"
ON public.course_modules FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.course_architectures ca
        JOIN public.course_projects cp ON cp.id = ca.course_project_id
        WHERE ca.id = course_modules.course_id
        AND (
            public.has_role_in_org(auth.uid(), cp.organization_id, 'content_director')
            OR public.has_role_in_org(auth.uid(), cp.organization_id, 'editor')
            OR public.is_super_admin(auth.uid())
        )
    )
);

-- Content roles podem atualizar módulos na própria org
DROP POLICY IF EXISTS "content_roles_update_modules" ON public.course_modules;
CREATE POLICY "content_roles_update_modules"
ON public.course_modules FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.course_architectures ca
        JOIN public.course_projects cp ON cp.id = ca.course_project_id
        WHERE ca.id = course_modules.course_id
        AND (
            public.has_role_in_org(auth.uid(), cp.organization_id, 'content_director')
            OR public.has_role_in_org(auth.uid(), cp.organization_id, 'editor')
            OR public.is_super_admin(auth.uid())
        )
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.course_architectures ca
        JOIN public.course_projects cp ON cp.id = ca.course_project_id
        WHERE ca.id = course_modules.course_id
        AND (
            public.has_role_in_org(auth.uid(), cp.organization_id, 'content_director')
            OR public.has_role_in_org(auth.uid(), cp.organization_id, 'editor')
            OR public.is_super_admin(auth.uid())
        )
    )
);

-- super_admin tem acesso total
DROP POLICY IF EXISTS "super_admin_full_access_modules" ON public.course_modules;
CREATE POLICY "super_admin_full_access_modules"
ON public.course_modules FOR ALL
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

-- service_account pode gerenciar módulos (para geração automática)
DROP POLICY IF EXISTS "service_account_manage_modules" ON public.course_modules;
CREATE POLICY "service_account_manage_modules"
ON public.course_modules FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.course_architectures ca
        JOIN public.course_projects cp ON cp.id = ca.course_project_id
        JOIN public.organization_members om ON om.organization_id = cp.organization_id
        WHERE ca.id = course_modules.course_id
        AND om.user_id = auth.uid()
        AND om.role = 'service_account'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.course_architectures ca
        JOIN public.course_projects cp ON cp.id = ca.course_project_id
        JOIN public.organization_members om ON om.organization_id = cp.organization_id
        WHERE ca.id = course_modules.course_id
        AND om.user_id = auth.uid()
        AND om.role = 'service_account'
    )
);

-- =============================================================================
-- MODULE VERSIONS
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.module_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID NOT NULL REFERENCES public.course_modules(id) ON DELETE CASCADE,
    version INTEGER NOT NULL DEFAULT 1,
    content_jsonb JSONB NOT NULL DEFAULT '{}'::jsonb,
    content_markdown TEXT,
    generation_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    quality_score NUMERIC(5,2) CHECK (quality_score >= 0 AND quality_score <= 100),
    originality_score NUMERIC(5,2) CHECK (originality_score >= 0 AND originality_score <= 100),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'approved', 'rejected')),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES auth.users(id),
    UNIQUE (module_id, version)
);

ALTER TABLE public.module_versions ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_module_versions_module ON public.module_versions(module_id);
CREATE INDEX idx_module_versions_version ON public.module_versions(module_id, version DESC);
CREATE INDEX idx_module_versions_status ON public.module_versions(status);

-- RLS: membros leem versões de módulos da própria org
DROP POLICY IF EXISTS "members_view_own_org_module_versions" ON public.module_versions;
CREATE POLICY "members_view_own_org_module_versions"
ON public.module_versions FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.course_modules cm
        JOIN public.course_architectures ca ON ca.id = cm.course_id
        JOIN public.course_projects cp ON cp.id = ca.course_project_id
        WHERE cm.id = module_versions.module_id
        AND (
            public.is_member_of_org(auth.uid(), cp.organization_id)
            OR public.is_super_admin(auth.uid())
        )
    )
);

-- Content roles podem inserir versões na própria org
DROP POLICY IF EXISTS "content_roles_insert_module_versions" ON public.module_versions;
CREATE POLICY "content_roles_insert_module_versions"
ON public.module_versions FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.course_modules cm
        JOIN public.course_architectures ca ON ca.id = cm.course_id
        JOIN public.course_projects cp ON cp.id = ca.course_project_id
        WHERE cm.id = module_versions.module_id
        AND (
            public.has_role_in_org(auth.uid(), cp.organization_id, 'content_director')
            OR public.has_role_in_org(auth.uid(), cp.organization_id, 'editor')
            OR public.has_role_in_org(auth.uid(), cp.organization_id, 'researcher')
            OR public.is_super_admin(auth.uid())
        )
    )
);

-- Content roles podem atualizar versões na própria org
DROP POLICY IF EXISTS "content_roles_update_module_versions" ON public.module_versions;
CREATE POLICY "content_roles_update_module_versions"
ON public.module_versions FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.course_modules cm
        JOIN public.course_architectures ca ON ca.id = cm.course_id
        JOIN public.course_projects cp ON cp.id = ca.course_project_id
        WHERE cm.id = module_versions.module_id
        AND (
            public.has_role_in_org(auth.uid(), cp.organization_id, 'content_director')
            OR public.has_role_in_org(auth.uid(), cp.organization_id, 'editor')
            OR public.is_super_admin(auth.uid())
        )
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.course_modules cm
        JOIN public.course_architectures ca ON ca.id = cm.course_id
        JOIN public.course_projects cp ON cp.id = ca.course_project_id
        WHERE cm.id = module_versions.module_id
        AND (
            public.has_role_in_org(auth.uid(), cp.organization_id, 'content_director')
            OR public.has_role_in_org(auth.uid(), cp.organization_id, 'editor')
            OR public.is_super_admin(auth.uid())
        )
    )
);

-- super_admin tem acesso total
DROP POLICY IF EXISTS "super_admin_full_access_module_versions" ON public.module_versions;
CREATE POLICY "super_admin_full_access_module_versions"
ON public.module_versions FOR ALL
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

-- service_account pode gerenciar versões (para geração automática)
DROP POLICY IF EXISTS "service_account_manage_module_versions" ON public.module_versions;
CREATE POLICY "service_account_manage_module_versions"
ON public.module_versions FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.course_modules cm
        JOIN public.course_architectures ca ON ca.id = cm.course_id
        JOIN public.course_projects cp ON cp.id = ca.course_project_id
        JOIN public.organization_members om ON om.organization_id = cp.organization_id
        WHERE cm.id = module_versions.module_id
        AND om.user_id = auth.uid()
        AND om.role = 'service_account'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.course_modules cm
        JOIN public.course_architectures ca ON ca.id = cm.course_id
        JOIN public.course_projects cp ON cp.id = ca.course_project_id
        JOIN public.organization_members om ON om.organization_id = cp.organization_id
        WHERE cm.id = module_versions.module_id
        AND om.user_id = auth.uid()
        AND om.role = 'service_account'
    )
);