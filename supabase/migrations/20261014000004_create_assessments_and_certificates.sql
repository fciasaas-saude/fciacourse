-- Migration: 20261014000004_create_assessments_and_certificates
-- Fase 4 — LMS & Assessment Layer (Avaliação e Certificados)
-- DEPENDÊNCIAS: course_modules (20261014000003), course_architectures, course_projects, organizations, set_updated_at()

-- =============================================================================
-- QUESTION BANKS
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.question_banks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    course_id UUID REFERENCES public.course_architectures(id) ON DELETE SET NULL,
    module_id UUID REFERENCES public.course_modules(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.question_banks ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_question_banks_org ON public.question_banks(organization_id);
CREATE INDEX idx_question_banks_course ON public.question_banks(course_id);
CREATE INDEX idx_question_banks_module ON public.question_banks(module_id);

CREATE OR REPLACE TRIGGER question_banks_updated_at
BEFORE UPDATE ON public.question_banks
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- RLS: membros leem bancos da própria org
DROP POLICY IF EXISTS "members_view_own_org_question_banks" ON public.question_banks;
CREATE POLICY "members_view_own_org_question_banks"
ON public.question_banks FOR SELECT
USING (
    public.is_member_of_org(auth.uid(), organization_id)
    OR public.is_super_admin(auth.uid())
);

-- Content roles podem gerenciar bancos na própria org
DROP POLICY IF EXISTS "content_roles_manage_question_banks" ON public.question_banks;
CREATE POLICY "content_roles_manage_question_banks"
ON public.question_banks FOR ALL
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

DROP POLICY IF EXISTS "super_admin_full_access_question_banks" ON public.question_banks;
CREATE POLICY "super_admin_full_access_question_banks"
ON public.question_banks FOR ALL
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

-- =============================================================================
-- QUESTIONS
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_id UUID NOT NULL REFERENCES public.question_banks(id) ON DELETE CASCADE,
    question_type TEXT NOT NULL CHECK (question_type IN ('multiple_choice', 'true_false', 'open_ended', 'matching')),
    content TEXT NOT NULL,
    options JSONB DEFAULT '[]'::jsonb,
    correct_answer JSONB NOT NULL,
    explanation TEXT,
    points NUMERIC(5,2) NOT NULL DEFAULT 1.0 CHECK (points > 0),
    difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_questions_bank ON public.questions(bank_id);
CREATE INDEX idx_questions_type ON public.questions(question_type);
CREATE INDEX idx_questions_difficulty ON public.questions(difficulty);

CREATE OR REPLACE TRIGGER questions_updated_at
BEFORE UPDATE ON public.questions
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- RLS: herda acesso via question_bank → organization
DROP POLICY IF EXISTS "members_view_own_org_questions" ON public.questions;
CREATE POLICY "members_view_own_org_questions"
ON public.questions FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.question_banks qb
        WHERE qb.id = questions.bank_id
        AND (
            public.is_member_of_org(auth.uid(), qb.organization_id)
            OR public.is_super_admin(auth.uid())
        )
    )
);

DROP POLICY IF EXISTS "content_roles_manage_questions" ON public.questions;
CREATE POLICY "content_roles_manage_questions"
ON public.questions FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.question_banks qb
        WHERE qb.id = questions.bank_id
        AND (
            public.has_role_in_org(auth.uid(), qb.organization_id, 'content_director')
            OR public.has_role_in_org(auth.uid(), qb.organization_id, 'editor')
            OR public.has_role_in_org(auth.uid(), qb.organization_id, 'researcher')
            OR public.is_super_admin(auth.uid())
        )
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.question_banks qb
        WHERE qb.id = questions.bank_id
        AND (
            public.has_role_in_org(auth.uid(), qb.organization_id, 'content_director')
            OR public.has_role_in_org(auth.uid(), qb.organization_id, 'editor')
            OR public.has_role_in_org(auth.uid(), qb.organization_id, 'researcher')
            OR public.is_super_admin(auth.uid())
        )
    )
);

DROP POLICY IF EXISTS "super_admin_full_access_questions" ON public.questions;
CREATE POLICY "super_admin_full_access_questions"
ON public.questions FOR ALL
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

-- =============================================================================
-- ENROLLMENTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.course_architectures(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'dropped', 'suspended')),
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    last_activity_at TIMESTAMPTZ,
    progress_percentage NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, course_id)
);

ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_enrollments_user ON public.enrollments(user_id);
CREATE INDEX idx_enrollments_course ON public.enrollments(course_id);
CREATE INDEX idx_enrollments_org ON public.enrollments(organization_id);
CREATE INDEX idx_enrollments_status ON public.enrollments(status);

CREATE OR REPLACE TRIGGER enrollments_updated_at
BEFORE UPDATE ON public.enrollments
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- RLS: alunos veem suas próprias matrículas; membros da org veem todas da org
DROP POLICY IF EXISTS "users_view_own_enrollments" ON public.enrollments;
CREATE POLICY "users_view_own_enrollments"
ON public.enrollments FOR SELECT
USING (
    auth.uid() = user_id
    OR public.is_member_of_org(auth.uid(), organization_id)
    OR public.is_super_admin(auth.uid())
);

-- Alunos podem se matricular (insert próprio)
DROP POLICY IF EXISTS "users_insert_own_enrollment" ON public.enrollments;
CREATE POLICY "users_insert_own_enrollment"
ON public.enrollments FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Membros da org podem gerenciar matrículas
DROP POLICY IF EXISTS "org_members_manage_enrollments" ON public.enrollments;
CREATE POLICY "org_members_manage_enrollments"
ON public.enrollments FOR ALL
USING (
    public.is_member_of_org(auth.uid(), organization_id)
    OR public.is_super_admin(auth.uid())
)
WITH CHECK (
    public.is_member_of_org(auth.uid(), organization_id)
    OR public.is_super_admin(auth.uid())
);

DROP POLICY IF EXISTS "super_admin_full_access_enrollments" ON public.enrollments;
CREATE POLICY "super_admin_full_access_enrollments"
ON public.enrollments FOR ALL
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

-- =============================================================================
-- LESSON PROGRESS
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.lesson_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id UUID NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
    module_id UUID NOT NULL REFERENCES public.course_modules(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
    score NUMERIC(5,2) CHECK (score >= 0 AND score <= 100),
    completed_at TIMESTAMPTZ,
    time_spent_seconds INTEGER NOT NULL DEFAULT 0 CHECK (time_spent_seconds >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (enrollment_id, module_id)
);

ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_lesson_progress_enrollment ON public.lesson_progress(enrollment_id);
CREATE INDEX idx_lesson_progress_module ON public.lesson_progress(module_id);
CREATE INDEX idx_lesson_progress_status ON public.lesson_progress(status);

CREATE OR REPLACE TRIGGER lesson_progress_updated_at
BEFORE UPDATE ON public.lesson_progress
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- RLS: aluno vê seu próprio progresso; org vê todos
DROP POLICY IF EXISTS "users_view_own_lesson_progress" ON public.lesson_progress;
CREATE POLICY "users_view_own_lesson_progress"
ON public.lesson_progress FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.enrollments e
        WHERE e.id = lesson_progress.enrollment_id
        AND (
            e.user_id = auth.uid()
            OR public.is_member_of_org(auth.uid(), e.organization_id)
            OR public.is_super_admin(auth.uid())
        )
    )
);

DROP POLICY IF EXISTS "users_update_own_lesson_progress" ON public.lesson_progress;
CREATE POLICY "users_update_own_lesson_progress"
ON public.lesson_progress FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.enrollments e
        WHERE e.id = lesson_progress.enrollment_id
        AND (
            e.user_id = auth.uid()
            OR public.is_member_of_org(auth.uid(), e.organization_id)
            OR public.is_super_admin(auth.uid())
        )
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.enrollments e
        WHERE e.id = lesson_progress.enrollment_id
        AND (
            e.user_id = auth.uid()
            OR public.is_member_of_org(auth.uid(), e.organization_id)
            OR public.is_super_admin(auth.uid())
        )
    )
);

DROP POLICY IF EXISTS "super_admin_full_access_lesson_progress" ON public.lesson_progress;
CREATE POLICY "super_admin_full_access_lesson_progress"
ON public.lesson_progress FOR ALL
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

-- =============================================================================
-- ASSESSMENT ATTEMPTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.assessment_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id UUID NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.course_architectures(id) ON DELETE CASCADE,
    module_id UUID REFERENCES public.course_modules(id) ON DELETE SET NULL,
    attempt_number INTEGER NOT NULL DEFAULT 1 CHECK (attempt_number > 0),
    total_questions INTEGER NOT NULL DEFAULT 0,
    correct_answers INTEGER NOT NULL DEFAULT 0,
    score NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 100),
    passed BOOLEAN NOT NULL DEFAULT false,
    answers JSONB NOT NULL DEFAULT '{}'::jsonb,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    submitted_at TIMESTAMPTZ,
    graded_at TIMESTAMPTZ,
    graded_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.assessment_attempts ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_assessment_attempts_enrollment ON public.assessment_attempts(enrollment_id);
CREATE INDEX idx_assessment_attempts_course ON public.assessment_attempts(course_id);
CREATE INDEX idx_assessment_attempts_module ON public.assessment_attempts(module_id);
CREATE INDEX idx_assessment_attempts_passed ON public.assessment_attempts(passed);

CREATE OR REPLACE TRIGGER assessment_attempts_updated_at
BEFORE UPDATE ON public.assessment_attempts
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- RLS: aluno vê suas próprias tentativas; org vê todas
DROP POLICY IF EXISTS "users_view_own_assessment_attempts" ON public.assessment_attempts;
CREATE POLICY "users_view_own_assessment_attempts"
ON public.assessment_attempts FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.enrollments e
        WHERE e.id = assessment_attempts.enrollment_id
        AND (
            e.user_id = auth.uid()
            OR public.is_member_of_org(auth.uid(), e.organization_id)
            OR public.is_super_admin(auth.uid())
        )
    )
);

-- Alunos podem criar tentativas (submeter prova)
DROP POLICY IF EXISTS "users_insert_own_assessment_attempt" ON public.assessment_attempts;
CREATE POLICY "users_insert_own_assessment_attempt"
ON public.assessment_attempts FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.enrollments e
        WHERE e.id = enrollment_id
        AND e.user_id = auth.uid()
    )
);

-- Org pode gerenciar tentativas (correção, reavaliação)
DROP POLICY IF EXISTS "org_members_manage_assessment_attempts" ON public.assessment_attempts;
CREATE POLICY "org_members_manage_assessment_attempts"
ON public.assessment_attempts FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.enrollments e
        WHERE e.id = assessment_attempts.enrollment_id
        AND (
            public.is_member_of_org(auth.uid(), e.organization_id)
            OR public.is_super_admin(auth.uid())
        )
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.enrollments e
        WHERE e.id = assessment_attempts.enrollment_id
        AND (
            public.is_member_of_org(auth.uid(), e.organization_id)
            OR public.is_super_admin(auth.uid())
        )
    )
);

DROP POLICY IF EXISTS "super_admin_full_access_assessment_attempts" ON public.assessment_attempts;
CREATE POLICY "super_admin_full_access_assessment_attempts"
ON public.assessment_attempts FOR ALL
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

-- =============================================================================
-- CERTIFICATES
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id UUID NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.course_architectures(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    verification_code TEXT NOT NULL UNIQUE,
    issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ,
    final_score NUMERIC(5,2) NOT NULL CHECK (final_score >= 0 AND final_score <= 100),
    completion_date DATE NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_certificates_enrollment ON public.certificates(enrollment_id);
CREATE INDEX idx_certificates_user ON public.certificates(user_id);
CREATE INDEX idx_certificates_verification ON public.certificates(verification_code);
CREATE INDEX idx_certificates_org ON public.certificates(organization_id);

CREATE OR REPLACE TRIGGER certificates_updated_at
BEFORE UPDATE ON public.certificates
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- RLS: usuário vê seus próprios certificados; org vê todos da org
DROP POLICY IF EXISTS "users_view_own_certificates" ON public.certificates;
CREATE POLICY "users_view_own_certificates"
ON public.certificates FOR SELECT
USING (
    auth.uid() = user_id
    OR public.is_member_of_org(auth.uid(), organization_id)
    OR public.is_super_admin(auth.uid())
);

-- Apenas org/super_admin/service_account podem emitir certificados
DROP POLICY IF EXISTS "org_members_issue_certificates" ON public.certificates;
CREATE POLICY "org_members_issue_certificates"
ON public.certificates FOR INSERT
WITH CHECK (
    public.is_member_of_org(auth.uid(), organization_id)
    OR public.is_super_admin(auth.uid())
);

DROP POLICY IF EXISTS "org_members_manage_certificates" ON public.certificates;
CREATE POLICY "org_members_manage_certificates"
ON public.certificates FOR UPDATE
USING (
    public.is_member_of_org(auth.uid(), organization_id)
    OR public.is_super_admin(auth.uid())
)
WITH CHECK (
    public.is_member_of_org(auth.uid(), organization_id)
    OR public.is_super_admin(auth.uid())
);

DROP POLICY IF EXISTS "super_admin_full_access_certificates" ON public.certificates;
CREATE POLICY "super_admin_full_access_certificates"
ON public.certificates FOR ALL
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

-- Service account pode emitir certificados automaticamente
DROP POLICY IF EXISTS "service_account_issue_certificates" ON public.certificates;
CREATE POLICY "service_account_issue_certificates"
ON public.certificates FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.user_id = auth.uid()
        AND om.role = 'service_account'
        AND om.organization_id = certificates.organization_id
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.user_id = auth.uid()
        AND om.role = 'service_account'
        AND om.organization_id = certificates.organization_id
    )
);