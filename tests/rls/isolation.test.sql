-- TESTES RLS: Isolamento Multi-Tenant e Permissões (Fase 1)
-- Executar em ambiente development com migrations aplicadas e seed.sql carregado.
-- NUNCA executar em produção ou staging.
--
-- ⚠️ AVISO IMPORTANTE:
-- Cenários que deliberadamente geram erro devem ser executados
-- individualmente, pois um erro aborta a transação PostgreSQL.
-- Não execute este arquivo inteiro de uma vez se incluir cenários de falha.
--
-- ESTRATÉGIA DE ROLES:
-- - Anônimo: SET LOCAL ROLE anon;
-- - Autenticado: SET LOCAL ROLE authenticated; + set_config('request.jwt.claims', ...)
-- - Service account: SET LOCAL ROLE service_role;
-- - Cada teste roda em transação isolada (BEGIN; ... ROLLBACK;)
-- - IDs são fictícios e vêm do seed manual; usuários correspondentes devem existir em auth.users
-- - SQL Editor administrativo ignora RLS; use psql ou endpoint PostgREST para validar acesso real
--
-- NOTA DE SEGURANÇA:
-- Funções internas (is_super_admin, is_member_of_org, has_role_in_org, set_updated_at, handle_new_user)
-- tiveram EXECUTE revogado de PUBLIC e authenticated. Elas funcionam apenas via RLS/triggers (SECURITY DEFINER).
-- Chamadas diretas como SELECT public.is_super_admin(...) falharão com "permission denied" para authenticated.
-- Testes de função abaixo usam superuser/service_role ou validam indiretamente via RLS.

-- =============================================================================
-- TESTE 1: Organização A não lê dados da Organização B
-- =============================================================================
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
SELECT count(*) AS org_count FROM public.organizations;
-- Esperado: 1 (apenas Org A)
SELECT count(*) AS cross_org_members FROM public.organization_members
WHERE organization_id = 'a0000000-0000-0000-0000-000000000002';
-- Esperado: 0 (membro da Org A não vê membros da Org B)
ROLLBACK;

-- =============================================================================
-- TESTE 2: Usuário comum NÃO pode criar sua própria membership
-- EXECUTAR INDIVIDUALMENTE — esperado: erro de RLS
-- =============================================================================
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
INSERT INTO public.organization_members (user_id, organization_id, role)
VALUES ('00000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'editor');
-- Esperado: ERRO de RLS (new row violates row-level security policy)
ROLLBACK;

-- =============================================================================
-- TESTE 3: Usuário comum NÃO pode se promover a super_admin
-- EXECUTAR INDIVIDUALMENTE — esperado: erro de RLS ou 0 linhas afetadas
-- =============================================================================
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
UPDATE public.organization_members SET role = 'super_admin'
WHERE user_id = '00000000-0000-0000-0000-000000000003'
AND organization_id = 'a0000000-0000-0000-0000-000000000001';
-- Esperado: ERRO de RLS ou UPDATE 0 (policy impede atualização por não-super_admin)
ROLLBACK;

-- =============================================================================
-- TESTE 4: Editor da Org B NÃO pode inserir membership na Org A
-- EXECUTAR INDIVIDUALMENTE — esperado: erro de RLS
-- =============================================================================
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
INSERT INTO public.organization_members (user_id, organization_id, role)
VALUES ('00000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'student');
-- Esperado: ERRO de RLS (editor não tem permissão INSERT em organization_members)
ROLLBACK;

-- =============================================================================
-- TESTE 5: Usuário anônimo não lê tabelas privadas
-- =============================================================================
BEGIN;
SET LOCAL ROLE anon;
SELECT count(*) AS anon_orgs FROM public.organizations;
-- Esperado: 0
SELECT count(*) AS anon_jobs FROM public.ai_jobs;
-- Esperado: 0
SELECT count(*) AS anon_profiles FROM public.profiles;
-- Esperado: 0
ROLLBACK;

-- =============================================================================
-- TESTE 6: ai_jobs é isolado por organization_id
-- =============================================================================
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
INSERT INTO public.ai_jobs (organization_id, job_type, idempotency_key, payload)
VALUES ('a0000000-0000-0000-0000-000000000001', 'test_job', 'key_iso_test_6', '{}');
-- Trocar para usuário da Org B
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
SELECT count(*) AS cross_org_jobs FROM public.ai_jobs
WHERE idempotency_key = 'key_iso_test_6';
-- Esperado: 0 (Org B não vê job da Org A)
ROLLBACK;

-- =============================================================================
-- TESTE 7a: Cliente não exclui audit_logs (IMUTÁVEL)
-- EXECUTAR INDIVIDUALMENTE — esperado: erro de RLS
-- =============================================================================
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
DELETE FROM public.audit_logs WHERE action = 'any_action';
-- Esperado: ERRO de RLS (nenhum papel comum tem DELETE)
ROLLBACK;

-- =============================================================================
-- TESTE 7b: Cliente não atualiza audit_logs (IMUTÁVEL)
-- EXECUTAR INDIVIDUALMENTE — esperado: erro de RLS
-- =============================================================================
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
UPDATE public.audit_logs SET metadata = '{"hacked":true}' WHERE action = 'any_action';
-- Esperado: ERRO de RLS (nenhum papel comum tem UPDATE)
ROLLBACK;

-- =============================================================================
-- TESTE 7c: Super_admin NÃO pode UPDATE audit_logs (IMUTÁVEL)
-- EXECUTAR INDIVIDUALMENTE — esperado: erro de RLS
-- =============================================================================
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
UPDATE public.audit_logs SET metadata = '{"edited_by":"super_admin"}' WHERE action = 'any_action';
-- Esperado: ERRO de RLS (super_admin também não tem UPDATE — tabela imutável)
ROLLBACK;

-- =============================================================================
-- TESTE 7d: Super_admin NÃO pode DELETE audit_logs (IMUTÁVEL)
-- EXECUTAR INDIVIDUALMENTE — esperado: erro de RLS
-- =============================================================================
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
DELETE FROM public.audit_logs WHERE action = 'any_action';
-- Esperado: ERRO de RLS (super_admin também não tem DELETE — tabela imutável)
ROLLBACK;

-- =============================================================================
-- TESTE 7e: Membro comum NÃO pode INSERT audit_logs diretamente
-- EXECUTAR INDIVIDUALMENTE — esperado: erro de RLS
-- =============================================================================
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
INSERT INTO public.audit_logs (organization_id, user_id, action, entity_type)
VALUES ('a0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'unauthorized_insert', 'test');
-- Esperado: ERRO de RLS (membro comum não tem policy INSERT — apenas service_account ou super_admin)
ROLLBACK;

-- =============================================================================
-- TESTE 7f: Service_account PODE INSERT audit_logs na própria org
-- =============================================================================
BEGIN;
SET LOCAL ROLE service_role;
INSERT INTO public.audit_logs (organization_id, user_id, action, entity_type)
VALUES ('a0000000-0000-0000-0000-000000000001', NULL, 'service_insert_test', 'test');
SELECT count(*) AS svc_audit_count FROM public.audit_logs
WHERE action = 'service_insert_test';
-- Esperado: 1
ROLLBACK;

-- =============================================================================
-- TESTE 7g: Super_admin PODE INSERT audit_logs
-- =============================================================================
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
INSERT INTO public.audit_logs (organization_id, user_id, action, entity_type)
VALUES ('a0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'sa_insert_test', 'test');
SELECT count(*) AS sa_audit_count FROM public.audit_logs
WHERE action = 'sa_insert_test';
-- Esperado: 1
ROLLBACK;

-- =============================================================================
-- TESTE 8: Funções auxiliares RLS — validação indireta via policies
-- NOTA: EXECUTE foi revogado de authenticated. Chamada direta falhará.
-- Validação ocorre indiretamente: se RLS funciona, as funções funcionam.
-- Para teste direto, usar service_role ou superuser.
-- =============================================================================
BEGIN;
SET LOCAL ROLE service_role;
SELECT public.is_super_admin('00000000-0000-0000-0000-000000000001') AS test_8a;
-- Esperado: TRUE
SELECT public.is_super_admin('00000000-0000-0000-0000-000000000002') AS test_8b;
-- Esperado: FALSE
SELECT public.is_member_of_org('00000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001') AS test_8c;
-- Esperado: TRUE
SELECT public.is_member_of_org('00000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002') AS test_8d;
-- Esperado: FALSE
ROLLBACK;

-- =============================================================================
-- TESTE 9: Service account pode inserir jobs na própria org
-- =============================================================================
BEGIN;
SET LOCAL ROLE service_role;
INSERT INTO public.ai_jobs (organization_id, job_type, idempotency_key, payload)
VALUES ('a0000000-0000-0000-0000-000000000001', 'service_test', 'key_svc_test_9', '{}');
SELECT count(*) AS svc_job_count FROM public.ai_jobs
WHERE idempotency_key = 'key_svc_test_9';
-- Esperado: 1
ROLLBACK;

-- =============================================================================
-- TESTE 10: Super admin pode gerenciar memberships em qualquer org
-- =============================================================================
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
INSERT INTO public.organization_members (user_id, organization_id, role)
VALUES ('00000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000002', 'researcher');
SELECT count(*) AS sa_cross_insert FROM public.organization_members
WHERE user_id = '00000000-0000-0000-0000-000000000004'
AND organization_id = 'a0000000-0000-0000-0000-000000000002';
-- Esperado: 1 (super_admin pode inserir em qualquer org)
ROLLBACK;

-- =============================================================================
-- TESTE 11: Funções internas NÃO são invocáveis por authenticated
-- EXECUTAR INDIVIDUALMENTE — esperado: erro de permissão
-- =============================================================================
BEGIN;
SET LOCAL ROLE authenticated;
SELECT public.is_super_admin('00000000-0000-0000-0000-000000000001');
-- Esperado: ERRO "permission denied for function is_super_admin"
ROLLBACK;