-- SEED FILE: Dados de teste para desenvolvimento local
-- ESTE ARQUIVO NÃO DEVE SER EXECUTADO EM PRODUÇÃO OU STAGING.
-- Uso: supabase db reset --db-url <local_dev_url> -- -f supabase/seed.sql
-- Ou manualmente em ambiente de dev isolado.

-- Organizações de teste para validação de isolamento multi-tenant
INSERT INTO public.organizations (id, name, slug) VALUES
    ('a0000000-0000-0000-0000-000000000001', 'FCIA Test Org A', 'fcia-test-a'),
    ('a0000000-0000-0000-0000-000000000002', 'FCIA Test Org B', 'fcia-test-b')
ON CONFLICT (id) DO NOTHING;

-- Membros de teste (IDs fictícios — devem corresponder a usuários reais em auth.users se o banco local permitir,
-- ou serem usados apenas para validar lógica de RLS via mocks em testes automatizados)
INSERT INTO public.organization_members (user_id, organization_id, role) VALUES
    ('00000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'super_admin'),
    ('00000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'editor'),
    ('00000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'student')
ON CONFLICT (user_id, organization_id) DO NOTHING;