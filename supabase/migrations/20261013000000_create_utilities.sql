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

-- Revogar execução pública para evitar uso indevido fora de triggers
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC;
-- Conceder apenas para authenticated (necessário para triggers em tabelas com RLS)
GRANT EXECUTE ON FUNCTION public.set_updated_at() TO authenticated;

COMMENT ON FUNCTION public.set_updated_at() IS
'Utility trigger function: sets updated_at to now(). SECURITY DEFINER with fixed search_path. Used by organizations, profiles, ai_jobs triggers. NOT for audit_logs (append-only).';