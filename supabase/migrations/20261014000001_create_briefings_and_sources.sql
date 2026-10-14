-- Migration: 20261014000001_create_briefings_and_sources
-- Fase 2 — Briefing e Biblioteca de Fontes
-- DEPENDÊNCIAS: organizations, profiles, organization_members, set_updated_at()

-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE public.briefing_status AS ENUM (
    'draft',
    'review',
    'approved',
    'archived'
);

CREATE TYPE public.source_type AS ENUM (
    'book',
    'article',
    'report',
    'video',
    'podcast',
    'internal_document',
    'legislation',
    'other'
);

CREATE TYPE public.rights_status AS ENUM (
    'public_domain',
    'creative_commons',
    'licensed',
    'fair_use',
    'proprietary',
    'pending_review'
);

CREATE TYPE public.processing_status AS ENUM (
    'pending',
    'extracting',
    'generating_cards',
    'completed',
    'failed',
    'needs_review'
);

-- =============================================================================
-- BRIEFINGS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.briefings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    title TEXT NOT NULL,
    problem_statement TEXT NOT NULL,
    target_audience TEXT NOT NULL,
    desired_outcome TEXT NOT NULL,
    audience_level TEXT,
    requested_format TEXT,
    estimated_duration INTEGER, -- minutos
    communication_tone TEXT,
    restrictions TEXT,
    status public.briefing_status NOT NULL DEFAULT 'draft',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.briefings ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_briefings_org ON public.briefings(organization_id);
CREATE INDEX idx_briefings_status ON public.briefings(status);
CREATE INDEX idx_briefings_created_by ON public.briefings(created_by);

CREATE OR REPLACE TRIGGER briefings_updated_at
    BEFORE UPDATE ON public.briefings
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- RLS: membros leem briefings da própria org
CREATE POLICY "members_view_own_org_briefings"
    ON public.briefings FOR SELECT
    USING (
        public.is_member_of_org(auth.uid(), organization_id)
        OR public.is_super_admin(auth.uid())
    );

-- RLS: content_director, editor, researcher podem criar briefings na própria org
CREATE POLICY "content_roles_insert_briefings"
    ON public.briefings FOR INSERT
    WITH CHECK (
        public.has_role_in_org(auth.uid(), organization_id, 'content_director')
        OR public.has_role_in_org(auth.uid(), organization_id, 'editor')
        OR public.has_role_in_org(auth.uid(), organization_id, 'researcher')
        OR public.is_super_admin(auth.uid())
    );

-- RLS: content_director e editor podem atualizar briefings da própria org
CREATE POLICY "content_roles_update_briefings"
    ON public.briefings FOR UPDATE
    USING (
        public.has_role_in_org(auth.uid(), organization_id, 'content_director')
        OR public.has_role_in_org(auth.uid(), organization_id, 'editor')
        OR public.is_super_admin(auth.uid())
    )
    WITH CHECK (
        public.has_role_in_org(auth.uid(), organization_id, 'content_director')
        OR public.has_role_in_org(auth.uid(), organization_id, 'editor')
        OR public.is_super_admin(auth.uid())
    );

-- RLS: super_admin tem acesso total
CREATE POLICY "super_admin_full_access_briefings"
    ON public.briefings FOR ALL
    USING (public.is_super_admin(auth.uid()))
    WITH CHECK (public.is_super_admin(auth.uid()));

-- =============================================================================
-- COURSE PROJECTS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.course_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    briefing_id UUID NOT NULL REFERENCES public.briefings(id) ON DELETE CASCADE,
    project_name TEXT NOT NULL,
    vertical TEXT,
    stage TEXT NOT NULL DEFAULT 'planning',
    priority SMALLINT NOT NULL DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
    owner_id UUID REFERENCES auth.users(id),
    budget_limit_cents BIGINT CHECK (budget_limit_cents >= 0),
    token_budget BIGINT CHECK (token_budget >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.course_projects ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_course_projects_org ON public.course_projects(organization_id);
CREATE INDEX idx_course_projects_briefing ON public.course_projects(briefing_id);
CREATE INDEX idx_course_projects_owner ON public.course_projects(owner_id);

CREATE OR REPLACE TRIGGER course_projects_updated_at
    BEFORE UPDATE ON public.course_projects
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "members_view_own_org_projects"
    ON public.course_projects FOR SELECT
    USING (
        public.is_member_of_org(auth.uid(), organization_id)
        OR public.is_super_admin(auth.uid())
    );

CREATE POLICY "content_roles_manage_projects"
    ON public.course_projects FOR ALL
    USING (
        public.has_role_in_org(auth.uid(), organization_id, 'content_director')
        OR public.has_role_in_org(auth.uid(), organization_id, 'editor')
        OR public.is_super_admin(auth.uid())
    )
    WITH CHECK (
        public.has_role_in_org(auth.uid(), organization_id, 'content_director')
        OR public.has_role_in_org(auth.uid(), organization_id, 'editor')
        OR public.is_super_admin(auth.uid())
    );

CREATE POLICY "super_admin_full_access_projects"
    ON public.course_projects FOR ALL
    USING (public.is_super_admin(auth.uid()))
    WITH CHECK (public.is_super_admin(auth.uid()));

-- =============================================================================
-- KNOWLEDGE SOURCES
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.knowledge_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    source_type public.source_type NOT NULL,
    title TEXT NOT NULL,
    author TEXT,
    publisher TEXT,
    publication_year SMALLINT,
    language TEXT NOT NULL DEFAULT 'pt-BR',
    drive_file_id TEXT,
    drive_url TEXT,
    storage_path TEXT,
    rights_status public.rights_status NOT NULL DEFAULT 'pending_review',
    permission_notes TEXT,
    classification TEXT,
    processing_status public.processing_status NOT NULL DEFAULT 'pending',
    page_count INTEGER,
    checksum TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.knowledge_sources ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_knowledge_sources_org ON public.knowledge_sources(organization_id);
CREATE INDEX idx_knowledge_sources_type ON public.knowledge_sources(source_type);
CREATE INDEX idx_knowledge_sources_processing ON public.knowledge_sources(processing_status);
CREATE INDEX idx_knowledge_sources_checksum ON public.knowledge_sources(checksum);

CREATE OR REPLACE TRIGGER knowledge_sources_updated_at
    BEFORE UPDATE ON public.knowledge_sources
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "members_view_own_org_sources"
    ON public.knowledge_sources FOR SELECT
    USING (
        public.is_member_of_org(auth.uid(), organization_id)
        OR public.is_super_admin(auth.uid())
    );

CREATE POLICY "content_roles_manage_sources"
    ON public.knowledge_sources FOR ALL
    USING (
        public.has_role_in_org(auth.uid(), organization_id, 'content_director')
        OR public.has_role_in_org(auth.uid(), organization_id, 'editor')
        OR public.has_role_in_org(auth.uid(), organization_id, 'researcher')
        OR public.is_super_admin(auth.uid())
    )
    WITH CHECK (
        public.has_role_in_org(auth.uid(), organization_id, 'content_director')
        OR public.has_role_in_org(auth.uid(), organization_id, 'editor')
        OR public.has_role_in_org(auth.uid(), organization_id, 'researcher')
        OR public.is_super_admin(auth.uid())
    );

CREATE POLICY "super_admin_full_access_sources"
    ON public.knowledge_sources FOR ALL
    USING (public.is_super_admin(auth.uid()))
    WITH CHECK (public.is_super_admin(auth.uid()));

-- =============================================================================
-- SOURCE KNOWLEDGE CARDS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.source_knowledge_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID NOT NULL REFERENCES public.knowledge_sources(id) ON DELETE CASCADE,
    generated_by UUID REFERENCES auth.users(id),
    model_name TEXT NOT NULL,
    thesis TEXT NOT NULL,
    teaching_goal TEXT NOT NULL,
    principles JSONB NOT NULL DEFAULT '[]'::jsonb,
    concepts JSONB NOT NULL DEFAULT '[]'::jsonb,
    method_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
    limitations JSONB NOT NULL DEFAULT '[]'::jsonb,
    fcia_direction TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.source_knowledge_cards ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_source_knowledge_cards_source ON public.source_knowledge_cards(source_id);
CREATE INDEX idx_source_knowledge_cards_version ON public.source_knowledge_cards(source_id, version DESC);

-- Cards herdam acesso via join com knowledge_sources
CREATE POLICY "members_view_own_org_cards"
    ON public.source_knowledge_cards FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.knowledge_sources ks
            WHERE ks.id = source_knowledge_cards.source_id
              AND (
                  public.is_member_of_org(auth.uid(), ks.organization_id)
                  OR public.is_super_admin(auth.uid())
              )
        )
    );

CREATE POLICY "content_roles_manage_cards"
    ON public.source_knowledge_cards FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.knowledge_sources ks
            WHERE ks.id = source_knowledge_cards.source_id
              AND (
                  public.has_role_in_org(auth.uid(), ks.organization_id, 'content_director')
                  OR public.has_role_in_org(auth.uid(), ks.organization_id, 'editor')
                  OR public.has_role_in_org(auth.uid(), ks.organization_id, 'researcher')
                  OR public.is_super_admin(auth.uid())
              )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.knowledge_sources ks
            WHERE ks.id = source_knowledge_cards.source_id
              AND (
                  public.has_role_in_org(auth.uid(), ks.organization_id, 'content_director')
                  OR public.has_role_in_org(auth.uid(), ks.organization_id, 'editor')
                  OR public.has_role_in_org(auth.uid(), ks.organization_id, 'researcher')
                  OR public.is_super_admin(auth.uid())
              )
        )
    );

CREATE POLICY "service_account_manage_cards"
    ON public.source_knowledge_cards FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.knowledge_sources ks
            JOIN public.organization_members om ON om.organization_id = ks.organization_id
            WHERE ks.id = source_knowledge_cards.source_id
              AND om.user_id = auth.uid()
              AND om.role = 'service_account'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.knowledge_sources ks
            JOIN public.organization_members om ON om.organization_id = ks.organization_id
            WHERE ks.id = source_knowledge_cards.source_id
              AND om.user_id = auth.uid()
              AND om.role = 'service_account'
        )
    );