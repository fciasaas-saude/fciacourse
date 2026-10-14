# FCIA Course Engine — Inventário Geral do Sistema

**Data:** 2026-10-14  
**Branch:** `main`  
**Commit:** `7f9bb9b22cff83e9ff97f1937b96a0d1f710adc1`

---

## 1. Banco de Dados e Migrations (Supabase)

### 1.1 Migrations Versionadas

| Arquivo | Descrição |
|---------|-----------|
| `20261013000000_create_utilities.sql` | Funções utilitárias base: `set_updated_at()` e infraestrutura comum |
| `20261013000001_create_organizations.sql` | Tabela `organizations` (raiz multi-tenant), RLS e policies de super_admin/membros |
| `20261013000002_create_profiles_and_roles.sql` | Enum `app_role`, tabelas `profiles` e `organization_members`, funções SECURITY DEFINER (`is_super_admin`, `has_role_in_org`, `is_member_of_org`, `handle_new_user`), trigger `on_auth_user_created` |
| `20261013000003_create_ai_jobs.sql` | Enum `job_status`, tabela `ai_jobs` (fila persistente de jobs), índices para polling, RLS por org/service_account |
| `20261013000004_create_audit_logs.sql` | Tabela `audit_logs` (append-only), índices por org/entidade/usuário, RLS restritivo (SELECT/INSERT apenas) |
| `20261014000001_create_briefings_and_sources.sql` | Enums `briefing_status`, `source_type`, `rights_status`, `processing_status`; tabelas `briefings`, `course_projects`, `knowledge_sources`, `source_knowledge_cards` com RLS completo |
| `20261014000002_create_course_architectures.sql` | Tabela `course_architectures` (arquitetura pedagógica versionada), RLS via join com `course_projects` |
| `20261014000003_create_modules_and_versions.sql` | Tabelas `course_modules` e `module_versions` (conteúdo estruturado JSONB), RLS via join com `course_architectures` → `course_projects` |
| `20261014000004_create_assessments_and_certificates.sql` | Tabelas `question_banks`, `questions`, `enrollments`, `lesson_progress`, `assessment_attempts`, `certificates` com RLS multi-tenant e regras de emissão |

### 1.2 Tabelas Criadas

| Tabela | Fase | Multi-tenant |
|--------|------|--------------|
| `organizations` | 1 | Raiz |
| `profiles` | 1 | Via user_id |
| `organization_members` | 1 | Sim |
| `ai_jobs` | 1 | Sim |
| `audit_logs` | 1 | Sim |
| `briefings` | 2 | Sim |
| `course_projects` | 2 | Sim |
| `knowledge_sources` | 2 | Sim |
| `source_knowledge_cards` | 2 | Via knowledge_sources |
| `course_architectures` | 3 | Via course_projects |
| `course_modules` | 3 | Via course_architectures |
| `module_versions` | 3 | Via course_modules |
| `question_banks` | 4 | Sim |
| `questions` | 4 | Via question_banks |
| `enrollments` | 4 | Sim |
| `lesson_progress` | 4 | Via enrollments |
| `assessment_attempts` | 4 | Via enrollments |
| `certificates` | 4 | Sim |

### 1.3 Enums

- `app_role`: super_admin, content_director, editor, researcher, client_admin, client_reviewer, student, service_account
- `briefing_status`: draft, review, approved, archived
- `source_type`: book, article, report, video, podcast, internal_document, legislation, other
- `rights_status`: public_domain, creative_commons, licensed, fair_use, proprietary, pending_review
- `processing_status`: pending, extracting, generating_cards, completed, failed, needs_review
- `job_status`: queued, running, retrying, completed, failed, cancelled

### 1.4 Funções Auxiliares (SECURITY DEFINER)

- `is_super_admin(_user_id UUID)` → BOOLEAN
- `has_role_in_org(_user_id UUID, _org_id UUID, _role app_role)` → BOOLEAN
- `is_member_of_org(_user_id UUID, _org_id UUID)` → BOOLEAN
- `handle_new_user()` → TRIGGER (auto-cria profile no signup)
- `set_updated_at()` → TRIGGER (atualiza updated_at automaticamente)

### 1.5 Triggers

- `organizations_updated_at`, `profiles_updated_at`, `briefings_updated_at`, `course_projects_updated_at`, `knowledge_sources_updated_at`, `source_knowledge_cards_updated_at`, `course_architectures_updated_at`, `course_modules_updated_at`, `question_banks_updated_at`, `questions_updated_at`, `enrollments_updated_at`, `lesson_progress_updated_at`, `assessment_attempts_updated_at`, `certificates_updated_at`
- `on_auth_user_created` (trigger em `auth.users` → chama `handle_new_user()`)

---

## 2. Camada de Aplicação e Rotas (Next.js App Router)

### 2.1 Rotas Públicas

| Rota | Arquivo | Descrição |
|------|---------|-----------|
| `/` | `apps/web/src/app/page.tsx` | Landing page |
| `/login` | `apps/web/src/app/login/page.tsx` | Tela de login |
| `/signup` | `apps/web/src/app/signup/page.tsx` | Tela de cadastro |
| `/forgot-password` | `apps/web/src/app/forgot-password/page.tsx` | Solicitação de recuperação de senha |
| `/reset-password` | `apps/web/src/app/reset-password/page.tsx` | Redefinição de senha (com token) |

### 2.2 Rotas Protegidas (Dashboard)

| Rota | Arquivo | Descrição |
|------|---------|-----------|
| `/dashboard` | `apps/web/src/app/dashboard/page.tsx` | Dashboard principal |
| `/dashboard/briefings` | `apps/web/src/app/dashboard/briefings/page.tsx` | Listagem de briefings |
| `/dashboard/briefings/new` | `apps/web/src/app/dashboard/briefings/new/page.tsx` | Criação de briefing |
| `/dashboard/sources` | `apps/web/src/app/dashboard/sources/page.tsx` | Biblioteca de fontes |
| `/dashboard/sources/new` | `apps/web/src/app/dashboard/sources/new/page.tsx` | Cadastro de fonte |
| `/dashboard/projects/[id]/architecture` | `apps/web/src/app/dashboard/projects/[id]/architecture/page.tsx` | Visualização da arquitetura pedagógica |
| `/dashboard/courses/[id]/modules/[moduleId]` | `apps/web/src/app/dashboard/courses/[id]/modules/[moduleId]/page.tsx` | Detalhe do módulo com conteúdo |
| `/dashboard/certificates` | `apps/web/src/app/dashboard/certificates/page.tsx` | Meus certificados |

---

## 3. Server Actions e Lógica de Negócio

| Arquivo | Action | Descrição |
|---------|--------|-----------|
| `apps/web/src/app/dashboard/briefings/actions.ts` | `createBriefing(formData)` | Cria briefing validado via Zod, vincula organization_id do usuário |
| `apps/web/src/app/dashboard/briefings/actions.ts` | `getBriefings()` | Lista briefings da organização do usuário |
| `apps/web/src/app/dashboard/briefings/[id]/actions.ts` | `recommendSources(briefingId)` | Simula recomendação de fontes baseada no briefing, insere em `knowledge_sources` |
| `apps/web/src/app/dashboard/sources/actions.ts` | `createSource(formData)` | Cadastra nova fonte de conhecimento com validação Zod |
| `apps/web/src/app/dashboard/sources/actions.ts` | `getSources()` | Lista fontes da organização do usuário |
| `apps/web/src/app/dashboard/projects/[id]/architecture/actions.ts` | `generateArchitecture(projectId)` | Gera arquitetura pedagógica simulada (promessa, resultados, módulos, avaliação) |
| `apps/web/src/app/dashboard/projects/[id]/architecture/actions.ts` | `getArchitecture(projectId)` | Busca última versão da arquitetura de um projeto |
| `apps/web/src/app/dashboard/courses/[id]/modules/actions.ts` | `generateModule(courseId, moduleNumber)` | Cria módulo + versão inicial com blocos FCIA (teoria, exemplo, atividade, erro comum, checklist, quiz) |
| `apps/web/src/app/dashboard/courses/[id]/modules/actions.ts` | `getModules(courseId)` | Lista módulos ordenados de um curso |
| `apps/web/src/app/dashboard/courses/[id]/modules/actions.ts` | `getModuleWithVersion(moduleId)` | Busca módulo com sua última versão de conteúdo |
| `apps/web/src/app/dashboard/courses/[id]/assessment/actions.ts` | `submitAssessment(formData)` | Submete prova, corrige server-side (multiple_choice/true_false), calcula nota, verifica aprovação ≥70% |
| `apps/web/src/app/dashboard/courses/[id]/assessment/actions.ts` | `getAssessmentResults(courseId)` | Lista tentativas de avaliação do usuário |

---

## 4. Tipos e Validações

### 4.1 Tipos TypeScript (`apps/web/src/types/`)

| Arquivo | Conteúdo |
|---------|----------|
| `briefing.ts` | Briefing, BriefingStatus, CreateBriefingInput, UpdateBriefingInput |
| `knowledge-source.ts` | KnowledgeSource, SourceType, RightsStatus, ProcessingStatus, CreateKnowledgeSourceInput |
| `architecture.ts` | CourseArchitecture, LearningOutcome, Module, ModuleActivity, FinalAssessment, AssessmentCriterion |
| `module.ts` | CourseModule, ModuleVersion, ContentBlock (Theory/Example/Activity/CommonMistake/Checklist/Quiz), ModuleContent, GenerationMetadata |
| `assessment.ts` | QuestionBank, Question, Enrollment, LessonProgress, AssessmentAttempt, AssessmentSubmissionInput, AssessmentResult |
| `certificate.ts` | Certificate, CertificateMetadata, CertificateIssueInput, CertificateVerificationResult |

### 4.2 Schemas Zod (`apps/web/src/lib/validations/`)

| Arquivo | Schemas Principais |
|---------|-------------------|
| `auth.ts` | Schemas de autenticação (login, signup, recuperação de senha) |
| `briefing.ts` | createBriefingSchema, updateBriefingSchema |
| `knowledge-source.ts` | createKnowledgeSourceSchema, updateKnowledgeSourceSchema |
| `architecture.ts` | createCourseArchitectureSchema, learningOutcomeSchema, moduleSchema, finalAssessmentSchema |
| `module.ts` | createCourseModuleSchema, createModuleVersionSchema, contentBlockSchema (discriminatedUnion), moduleContentSchema |
| `assessment.ts` | assessmentSubmissionSchema, certificateIssueSchema, MIN_PASSING_SCORE = 70 |

---

## 5. Pontos Pendentes Identificados

### 5.1 Integração com Claude API (Anthropic)
- **Status:** Não implementado
- **Impacto:** As ações `recommendSources`, `generateArchitecture` e `generateModule` usam dados simulados/estruturados hardcoded
- **Necessário:** Implementar chamadas reais à Anthropic API com prompts contextualizados pelo briefing + fontes + arquitetura

### 5.2 Conexão com Google Drive
- **Status:** Não implementado
- **Impacto:** Campos `drive_file_id` e `drive_url` existem na tabela `knowledge_sources` mas não há ingestão real
- **Necessário:** OAuth2 com Google Drive API, extração de PDF/documentos, pipeline de geração de knowledge cards

### 5.3 Refinamento Visual UI/UX
- **Status:** Funcional mas básico (Tailwind inline, sem design system)
- **Impacto:** Interface operacional mas sem polimento visual para produção
- **Necessário:** Componentes shadcn/ui, design tokens consistentes, responsividade refinada, feedback visual (loading states, toasts, skeletons)

### 5.4 Outros Pontos
- Emissão automática de certificados (lógica de verificação de conclusão completa não implementada)
- Worker para processamento assíncrono de `ai_jobs`
- Testes automatizados (unitários e E2E)
- CI/CD pipeline configurado
- Seed data para desenvolvimento/testes

---

*Documento gerado automaticamente como parte do processo de consolidação do FCIA Course Engine.*