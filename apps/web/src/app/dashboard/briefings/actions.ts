'use server';

import { createClient } from '@/lib/supabase/server';
import { createBriefingSchema, type CreateBriefingInput } from '@/lib/validations/briefing';
import { revalidatePath } from 'next/cache';

export async function createBriefing(formData: FormData) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: 'Usuário não autenticado.' };
  }

  // Obter organization_id do usuário
  const { data: membership, error: memberError } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .single();

  if (memberError || !membership) {
    return { error: 'Usuário não pertence a nenhuma organização.' };
  }

  const rawData: Record<string, unknown> = {};
  formData.forEach((value, key) => {
    if (key === 'estimated_duration') {
      rawData[key] = value ? Number(value) : null;
    } else {
      rawData[key] = value === '' ? null : value;
    }
  });
  rawData.organization_id = membership.organization_id;

  const parsed = createBriefingSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const insertData: CreateBriefingInput & { organization_id: string; created_by?: string } = {
    ...parsed.data,
    organization_id: membership.organization_id,
  };

  const { error: insertError } = await supabase
    .from('briefings')
    .insert(insertData);

  if (insertError) {
    return { error: insertError.message };
  }

  revalidatePath('/dashboard/briefings');
  return { success: true };
}

export async function getBriefings() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { briefings: [], error: 'Usuário não autenticado.' };
  }

  const { data: membership, error: memberError } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .single();

  if (memberError || !membership) {
    return { briefings: [], error: 'Usuário não pertence a nenhuma organização.' };
  }

  const { data, error } = await supabase
    .from('briefings')
    .select('*')
    .eq('organization_id', membership.organization_id)
    .order('created_at', { ascending: false });

  if (error) {
    return { briefings: [], error: error.message };
  }

  return { briefings: data ?? [] };
}