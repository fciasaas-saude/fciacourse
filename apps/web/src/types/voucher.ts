// Tipos para Vouchers (Chaves de Convite) — FCIA Course Engine
// Alinhado com migration 20261015000001_create_vouchers.sql

export interface Voucher {
  id: string;
  code: string;
  batch_name: string;
  organization_id: string;
  course_id: string | null;
  max_uses: number;
  current_uses: number;
  is_active: boolean;
  expires_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface VoucherRedemption {
  id: string;
  voucher_id: string;
  user_id: string;
  redeemed_at: string;
}

export interface VoucherBatchInput {
  batch_name: string;
  quantity: number;
  max_uses?: number;
  course_id?: string | null;
  expires_at?: string | null;
}

export interface VoucherValidationResult {
  valid: boolean;
  error?: string;
  batch_name?: string;
  uses_remaining?: number;
}

export interface VoucherRedemptionResult {
  success: boolean;
  error?: string;
  voucher_id?: string;
  batch_name?: string;
  course_id?: string | null;
  organization_id?: string;
}