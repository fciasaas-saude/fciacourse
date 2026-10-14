'use server';

import { createClient } from '@/lib/supabase/server';
import { createKnowledgeSourceSchema, type CreateKnowledgeSourceInput } from '@/lib/validations/knowledge-source';
import { revalidatePath } from 'next/cache';

export async function createSource(formData: FormData) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: 'Usuário não autenticado.' };
  }

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
    if (key === 'publication_year' || key === 'page_count') {
      rawData[key] = value ? Number(value) : null;
    } else {
      rawData[key] = value === '' ? null : value;
    }
  });

  const parsed = createKnowledgeSourceSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const insertData: CreateKnowledgeSourceInput & { organization_id: string } = {
    ...parsed.data,
    organization_id: membership.organization_id,
  };

  const { error: insertError } = await supabase
    .from('knowledge_sources')
    .insert(insertData);

  if (insertError) {
    return { error: insertError.message };
  }

  revalidatePath('/dashboard/sources');
  return { success: true };
}

export async function getSources() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { sources: [], error: 'Usuário não autenticado.' };
  }

  const { data: membership, error: memberError } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .single();

  if (memberError || !membership) {
    return { sources: [], error: 'Usuário não pertence a nenhuma organização.' };
  }

  const { data, error } = await supabase
    .from('knowledge_sources')
    .select('*')
    .eq('organization_id', membership.organization_id)
    .order('created_at', { ascending: false });

  if (error) {
    return { sources: [], error: error.message };
  }

  return { sources: data ?? [] };
}