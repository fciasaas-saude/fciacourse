-- Migration: 0000_create_utilities
-- Fase 1 — Fundação segura e isolada
-- Cria funções utilitárias globais antes de qualquer trigger que as referencie

-- Função utilitária para atualizar updated_at automaticamente
-- Usada por triggers em organizations, profiles, ai_jobs
-- NÃO usada por audit_logs (append-only)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Revogar execução pública e de authenticated para impedir invocação direta pelo frontend.
-- A função é executada apenas internamente por triggers (SECURITY DEFINER),
-- que rodam com privilégios do dono da função, não do usuário autenticado.
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM authenticated;

COMMENT ON FUNCTION public.set_updated_at() IS
'INTERNAL ONLY — Utility trigger function: sets updated_at to now(). SECURITY DEFINER with fixed search_path. Used by organizations, profiles, ai_jobs triggers. NOT for audit_logs (append-only). NOT a public API — EXECUTE revoked from authenticated and PUBLIC. Triggers execute this server-side via SECURITY DEFINER.';