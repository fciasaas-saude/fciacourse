-- Migration: 20261015000001_create_vouchers
-- Sistema de Vouchers (Chaves de Convite) — FCIA Course Engine
-- DEPENDÊNCIAS: organizations, profiles, organization_members, set_updated_at()
-- =============================================================================
-- VOUCHERS
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  batch_name TEXT NOT NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.course_architectures(id) ON DELETE SET NULL,
  max_uses INTEGER NOT NULL DEFAULT 1 CHECK (max_uses > 0),
  current_uses INTEGER NOT NULL DEFAULT 0 CHECK (current_uses >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT voucher_uses_within_max CHECK (current_uses <= max_uses)
);

ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_vouchers_code ON public.vouchers(code);
CREATE INDEX idx_vouchers_batch ON public.vouchers(batch_name);
CREATE INDEX idx_vouchers_org ON public.vouchers(organization_id);
CREATE INDEX idx_vouchers_active ON public.vouchers(is_active) WHERE is_active = true;

CREATE OR REPLACE TRIGGER vouchers_updated_at
  BEFORE UPDATE ON public.vouchers
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- RLS: membros da org leem vouchers da própria org
DROP POLICY IF EXISTS "members_view_own_org_vouchers" ON public.vouchers;
CREATE POLICY "members_view_own_org_vouchers"
  ON public.vouchers FOR SELECT
  USING (
    public.is_member_of_org(auth.uid(), organization_id)
    OR public.is_super_admin(auth.uid())
  );

-- Apenas content_director / super_admin podem criar vouchers
DROP POLICY IF EXISTS "admins_insert_vouchers" ON public.vouchers;
CREATE POLICY "admins_insert_vouchers"
  ON public.vouchers FOR INSERT
  WITH CHECK (
    public.has_role_in_org(auth.uid(), organization_id, 'content_director')
    OR public.is_super_admin(auth.uid())
  );

-- Apenas content_director / super_admin podem atualizar vouchers
DROP POLICY IF EXISTS "admins_update_vouchers" ON public.vouchers;
CREATE POLICY "admins_update_vouchers"
  ON public.vouchers FOR UPDATE
  USING (
    public.has_role_in_org(auth.uid(), organization_id, 'content_director')
    OR public.is_super_admin(auth.uid())
  )
  WITH CHECK (
    public.has_role_in_org(auth.uid(), organization_id, 'content_director')
    OR public.is_super_admin(auth.uid())
  );

DROP POLICY IF EXISTS "super_admin_full_access_vouchers" ON public.vouchers;
CREATE POLICY "super_admin_full_access_vouchers"
  ON public.vouchers FOR ALL
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- =============================================================================
-- VOUCHER REDEMPTIONS (histórico de uso)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.voucher_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_id UUID NOT NULL REFERENCES public.vouchers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (voucher_id, user_id)
);

ALTER TABLE public.voucher_redemptions ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_voucher_redemptions_voucher ON public.voucher_redemptions(voucher_id);
CREATE INDEX idx_voucher_redemptions_user ON public.voucher_redemptions(user_id);

-- Usuário vê suas próprias redenções
DROP POLICY IF EXISTS "users_view_own_redemptions" ON public.voucher_redemptions;
CREATE POLICY "users_view_own_redemptions"
  ON public.voucher_redemptions FOR SELECT
  USING (auth.uid() = user_id);

-- Membros da org veem redenções dos vouchers da org
DROP POLICY IF EXISTS "members_view_org_redemptions" ON public.voucher_redemptions;
CREATE POLICY "members_view_org_redemptions"
  ON public.voucher_redemptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.vouchers v
      WHERE v.id = voucher_redemptions.voucher_id
      AND public.is_member_of_org(auth.uid(), v.organization_id)
    )
    OR public.is_super_admin(auth.uid())
  );

-- Inserção via função SECURITY DEFINER (abaixo) — sem política pública de INSERT

-- =============================================================================
-- FUNÇÃO: validar e resgatar voucher (SECURITY DEFINER)
-- Garante atomicidade: verifica disponibilidade, incrementa current_uses, registra redenção
-- =============================================================================
CREATE OR REPLACE FUNCTION public.redeem_voucher(
  _code TEXT,
  _user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _voucher RECORD;
  _result JSONB;
BEGIN
  -- Buscar voucher ativo pelo código (case-insensitive, trim)
  SELECT * INTO _voucher
  FROM public.vouchers
  WHERE UPPER(TRIM(code)) = UPPER(TRIM(_code))
    AND is_active = true
  FOR UPDATE;

  IF _voucher IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Código de voucher inválido ou inativo.');
  END IF;

  -- Verificar expiração
  IF _voucher.expires_at IS NOT NULL AND _voucher.expires_at < now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Este voucher expirou.');
  END IF;

  -- Verificar usos restantes
  IF _voucher.current_uses >= _voucher.max_uses THEN
    RETURN jsonb_build_object('success', false, 'error', 'Este voucher já atingiu o limite de usos.');
  END IF;

  -- Verificar se usuário já resgatou este voucher
  IF EXISTS (
    SELECT 1 FROM public.voucher_redemptions
    WHERE voucher_id = _voucher.id AND user_id = _user_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Você já utilizou este voucher.');
  END IF;

  -- Incrementar contador de usos
  UPDATE public.vouchers
  SET current_uses = current_uses + 1
  WHERE id = _voucher.id;

  -- Registrar redenção
  INSERT INTO public.voucher_redemptions (voucher_id, user_id)
  VALUES (_voucher.id, _user_id);

  _result := jsonb_build_object(
    'success', true,
    'voucher_id', _voucher.id,
    'batch_name', _voucher.batch_name,
    'course_id', _voucher.course_id,
    'organization_id', _voucher.organization_id
  );

  RETURN _result;
END;
$$;

-- Permissão de execução para usuários autenticados
GRANT EXECUTE ON FUNCTION public.redeem_voucher(TEXT, UUID) TO authenticated;

-- =============================================================================
-- FUNÇÃO: validar voucher sem resgatar (para pré-check no signup)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.validate_voucher(
  _code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _voucher RECORD;
BEGIN
  SELECT * INTO _voucher
  FROM public.vouchers
  WHERE UPPER(TRIM(code)) = UPPER(TRIM(_code))
    AND is_active = true;

  IF _voucher IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Código de voucher inválido ou inativo.');
  END IF;

  IF _voucher.expires_at IS NOT NULL AND _voucher.expires_at < now() THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Este voucher expirou.');
  END IF;

  IF _voucher.current_uses >= _voucher.max_uses THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Este voucher já atingiu o limite de usos.');
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'batch_name', _voucher.batch_name,
    'uses_remaining', _voucher.max_uses - _voucher.current_uses
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_voucher(TEXT) TO anon, authenticated;