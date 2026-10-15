'use server';

import { createClient } from '@/lib/supabase/server';
import { generateVoucherBatchSchema } from '@/lib/validations/voucher';
import { revalidatePath } from 'next/cache';
import crypto from 'crypto';

function generateCode(): string {
  // FCIA-XXXX-XXXX format
  const part1 = crypto.randomBytes(2).toString('hex').toUpperCase();
  const part2 = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `FCIA-${part1}-${part2}`;
}

export async function generateVoucherBatch(formData: FormData) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: 'Usuário não autenticado.' };
  }

  const { data: membership, error: memberError } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .single();

  if (memberError || !membership) {
    return { error: 'Usuário não pertence a nenhuma organização.' };
  }

  const allowedRoles = ['content_director', 'super_admin'];
  if (!allowedRoles.includes(membership.role)) {
    return { error: 'Permissão insuficiente. Apenas content_director ou super_admin podem gerar vouchers.' };
  }

  const raw = {
    batch_name: formData.get('batch_name') as string,
    quantity: Number(formData.get('quantity')),
    max_uses: formData.get('max_uses') ? Number(formData.get('max_uses')) : 1,
    course_id: (formData.get('course_id') as string) || null,
    expires_at: (formData.get('expires_at') as string) || null,
  };

  const parsed = generateVoucherBatchSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const input = parsed.data;

  // Gerar códigos únicos
  const codes = new Set<string>();
  while (codes.size < input.quantity) {
    codes.add(generateCode());
  }

  const rows = Array.from(codes).map((code) => ({
    code,
    batch_name: input.batch_name,
    organization_id: membership.organization_id,
    course_id: input.course_id ?? null,
    max_uses: input.max_uses,
    current_uses: 0,
    is_active: true,
    expires_at: input.expires_at ?? null,
    created_by: user.id,
  }));

  const { error: insertError } = await supabase.from('vouchers').insert(rows);
  if (insertError) {
    return { error: `Erro ao gerar vouchers: ${insertError.message}` };
  }

  revalidatePath('/dashboard/admin/vouchers');
  return { success: true, generated: input.quantity };
}

export async function toggleVoucherActive(voucherId: string, isActive: boolean) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: 'Usuário não autenticado.' };
  }

  const { error } = await supabase
    .from('vouchers')
    .update({ is_active: isActive })
    .eq('id', voucherId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/dashboard/admin/vouchers');
  return { success: true };
}

export async function getVouchers() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { vouchers: [], error: 'Usuário não autenticado.' };
  }

  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .single();

  if (!membership) {
    return { vouchers: [], error: 'Sem organização.' };
  }

  const { data, error } = await supabase
    .from('vouchers')
    .select('*')
    .eq('organization_id', membership.organization_id)
    .order('created_at', { ascending: false });

  if (error) {
    return { vouchers: [], error: error.message };
  }

  return { vouchers: data ?? [] };
}

export async function validateVoucherCode(code: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('validate_voucher', { _code: code });
  if (error) {
    return { valid: false, error: error.message };
  }
  return data as { valid: boolean; error?: string; batch_name?: string; uses_remaining?: number };
}

export async function redeemVoucherForUser(code: string, userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('redeem_voucher', { _code: code, _user_id: userId });
  if (error) {
    return { success: false, error: error.message };
  }
  return data as { success: boolean; error?: string; voucher_id?: string; organization_id?: string; course_id?: string | null };
}