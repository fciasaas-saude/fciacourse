'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function recommendSources(briefingId: string) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: 'Usuário não autenticado.' };
  }

  // Verificar papel do usuário
  const { data: membership, error: memberError } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .single();

  if (memberError || !membership) {
    return { error: 'Usuário não pertence a nenhuma organização.' };
  }

  const allowedRoles = ['content_director', 'editor', 'researcher'];
  if (!allowedRoles.includes(membership.role)) {
    return { error: 'Permissão insuficiente para recomendar fontes.' };
  }

  // Buscar briefing
  const { data: briefing, error: briefingError } = await supabase
    .from('briefings')
    .select('*')
    .eq('id', briefingId)
    .eq('organization_id', membership.organization_id)
    .single();

  if (briefingError || !briefing) {
    return { error: 'Briefing não encontrado.' };
  }

  // Simulação estruturada de recomendação baseada no briefing
  // Em produção, isso seria substituído por chamada à IA
  const recommendations = [
    {
      title: `Fundamentos de ${briefing.target_audience}`,
      source_type: 'book' as const,
      author: 'Autor Referência',
      rights_status: 'pending_review' as const,
      language: 'pt-BR',
    },
    {
      title: `Estudo de Caso: ${briefing.problem_statement.substring(0, 50)}...`,
      source_type: 'article' as const,
      author: 'Instituto de Pesquisa',
      rights_status: 'pending_review' as const,
      language: 'pt-BR',
    },
    {
      title: `Guia Prático para ${briefing.desired_outcome.substring(0, 40)}`,
      source_type: 'report' as const,
      author: 'Consultoria Especializada',
      rights_status: 'pending_review' as const,
      language: 'pt-BR',
    },
  ];

  // Inserir fontes recomendadas na tabela knowledge_sources
  const sourcesToInsert = recommendations.map((rec) => ({
    organization_id: membership.organization_id,
    ...rec,
  }));

  const { error: insertError } = await supabase
    .from('knowledge_sources')
    .insert(sourcesToInsert);

  if (insertError) {
    return { error: `Erro ao salvar recomendações: ${insertError.message}` };
  }

  revalidatePath('/dashboard/sources');
  revalidatePath(`/dashboard/briefings/${briefingId}`);

  return { success: true, count: sourcesToInsert.length };
}