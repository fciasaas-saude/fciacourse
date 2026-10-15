-- Migration: 20261015000002_setup_super_admin
-- Configuração definitiva do Super Admin Master: fciaoficial@gmail.com
-- DEPENDÊNCIAS: organizations, profiles, organization_members, app_role enum
-- =============================================================================

-- 1. Criar organização FCIA oficial (se não existir)
INSERT INTO public.organizations (id, name, slug, brand_config)
VALUES (
  gen_random_uuid(),
  'FCIA Oficial',
  'fcia-oficial',
  '{"tier": "enterprise"}'::jsonb
)
ON CONFLICT (slug) DO NOTHING;

-- 2. Função para garantir que um email seja super_admin
CREATE OR REPLACE FUNCTION public.ensure_super_admin(_email TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID;
  _org_id UUID;
BEGIN
  -- Buscar user_id pelo email
  SELECT id INTO _user_id FROM auth.users WHERE email = _email;

  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário com email % não encontrado em auth.users', _email;
  END IF;

  -- Buscar organização FCIA Oficial
  SELECT id INTO _org_id FROM public.organizations WHERE slug = 'fcia-oficial';

  IF _org_id IS NULL THEN
    RAISE EXCEPTION 'Organização FCIA Oficial não encontrada';
  END IF;

  -- Garantir profile existe
  INSERT INTO public.profiles (id, display_name)
  VALUES (_user_id, 'FCIA Admin Master')
  ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name;

  -- Garantir membership como super_admin na org FCIA
  INSERT INTO public.organization_members (user_id, organization_id, role)
  VALUES (_user_id, _org_id, 'super_admin')
  ON CONFLICT (user_id, organization_id) DO UPDATE SET role = 'super_admin';

  -- Marcar como super_admin global (se houver coluna is_super_admin em profiles)
  -- Nota: a função is_super_admin() já verifica via organization_members com role='super_admin'
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_super_admin(TEXT) TO postgres, service_role;

-- 3. Executar para o email específico (será executado após o usuário se cadastrar)
-- Esta linha será executada manualmente ou via trigger após signup
-- SELECT public.ensure_super_admin('fciaoficial@gmail.com');

-- 4. View auxiliar para listar super admins
CREATE OR REPLACE VIEW public.super_admins AS
SELECT
  u.id as user_id,
  u.email,
  p.display_name,
  om.organization_id,
  o.name as organization_name,
  om.role,
  om.invited_at as member_since
FROM auth.users u
JOIN public.profiles p ON p.id = u.id
JOIN public.organization_members om ON om.user_id = u.id
JOIN public.organizations o ON o.id = om.organization_id
WHERE om.role = 'super_admin';

GRANT SELECT ON public.super_admins TO authenticated;