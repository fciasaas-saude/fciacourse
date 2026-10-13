-- TESTES RLS: Isolamento Multi-Tenant e Permissões (Fase 1)
-- Executar em ambiente development com migrations aplicadas e seed.sql carregado.
-- NUNCA executar em produção ou staging.

-- =============================================================================
-- TESTE 1: Organização A não lê dados da Organização B
-- =============================================================================
SET request.jwt.claims = '{"sub": "00000000-0000-0000-0000-000000000001"}';
SELECT count(*) FROM public.organizations; -- Esperado: 1 (Org A)
SELECT * FROM public.organization_members WHERE organization_id = 'a0000000-0000-0000-0000-000000000002'; -- Esperado: 0 linhas

-- =============================================================================
-- TESTE 2: Usuário comum NÃO pode criar sua própria membership
-- =============================================================================
SET request.jwt.claims = '{"sub": "00000000-0000-0000-0000-000000000003"}'; -- student da Org A
INSERT INTO public.organization_members (user_id, organization_id, role)
VALUES ('00000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'editor');
-- Esperado: ERRO de RLS (policy violation) — usuário comum não pode inserir membership

-- =============================================================================
-- TESTE 3: Usuário comum NÃO pode se promover a super_admin
-- =============================================================================
SET request.jwt.claims = '{"sub": "00000000-0000-0000-0000-000000000003"}';
UPDATE public.organization_members SET role = 'super_admin'
WHERE user_id = '00000000-0000-0000-0000-000000000003' AND organization_id = 'a0000000-0000-0000-0000-000000000001';
-- Esperado: ERRO de RLS — apenas super_admin pode atualizar memberships

-- =============================================================================
-- TESTE 4: Usuário comum NÃO pode criar membership em outra organização
-- =============================================================================
SET request.jwt.claims = '{"sub": "00000000-0000-0000-0000-000000000001"}'; -- super_admin Org A
-- Super_admin PODE inserir em qualquer org (comportamento esperado)
-- Mas editor da Org B NÃO pode inserir na Org A:
SET request.jwt.claims = '{"sub": "00000000-0000-0000-0000-000000000002"}'; -- editor Org B
INSERT INTO public.organization_members (user_id, organization_id, role)
VALUES ('00000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'student');
-- Esperado: ERRO de RLS — editor não tem permissão INSERT

-- =============================================================================
-- TESTE 5: Usuário anônimo não lê tabelas privadas
-- =============================================================================
RESET ROLE;
SELECT * FROM public.organizations LIMIT 1; -- Esperado: 0 linhas ou ERRO
SELECT * FROM public.ai_jobs LIMIT 1; -- Esperado: 0 linhas ou ERRO

-- =============================================================================
-- TESTE 6: ai_jobs é isolado por organization_id
-- =============================================================================
SET request.jwt.claims = '{"sub": "00000000-0000-0000-0000-000000000001"}';
INSERT INTO public.ai_jobs (organization_id, job_type, idempotency_key, payload)
VALUES ('a0000000-0000-0000-0000-000000000001', 'test_job', 'key_iso_1', '{}');
SET request.jwt.claims = '{"sub": "00000000-0000-0000-0000-000000000002"}'; -- Org B
SELECT * FROM public.ai_jobs WHERE idempotency_key = 'key_iso_1'; -- Esperado: 0 linhas

-- =============================================================================
-- TESTE 7: Cliente não altera ou exclui audit_logs
-- =============================================================================
SET request.jwt.claims = '{"sub": "00000000-0000-0000-0000-000000000001"}';
INSERT INTO public.audit_logs (organization_id, user_id, action, entity_type)
VALUES ('a0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'test_action', 'test_entity');
SET request.jwt.claims = '{"sub": "00000000-0000-0000-0000-000000000003"}'; -- student
DELETE FROM public.audit_logs WHERE action = 'test_action'; -- Esperado: ERRO ou 0 linhas
UPDATE public.audit_logs SET metadata = '{"hacked": true}' WHERE action = 'test_action'; -- Esperado: ERRO ou 0 linhas

-- =============================================================================
-- TESTE 8: Funções auxiliares RLS respeitam associação correta
-- =============================================================================
SET request.jwt.claims = '{"sub": "00000000-0000-0000-0000-000000000001"}';
SELECT public.is_super_admin('00000000-0000-0000-0000-000000000001'); -- TRUE
SELECT public.is_super_admin('00000000-0000-0000-0000-000000000002'); -- FALSE
SELECT public.is_member_of_org('00000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001'); -- TRUE
SELECT public.is_member_of_org('00000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002'); -- FALSE