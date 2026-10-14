'use server';

import { createClient } from '@/lib/supabase/server';
import { DEFAULT_BIBLIOTECAS_FOLDER_ID, listPdfFilesInFolder } from '@/lib/google-drive';
import { revalidatePath } from 'next/cache';

export async function syncDriveBooks() {
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

  const allowedRoles = ['content_director', 'editor', 'researcher'];
  if (!allowedRoles.includes(membership.role)) {
    return { error: 'Permissão insuficiente para sincronizar livros.' };
  }

  // Em produção, o accessToken viria de um token OAuth2 armazenado com segurança
  // ou de uma service account configurada no servidor.
  // Aqui usamos um placeholder para demonstrar a integração estrutural.
  const accessToken = process.env.GOOGLE_DRIVE_ACCESS_TOKEN ?? '';
  if (!accessToken) {
    return {
      error: 'GOOGLE_DRIVE_ACCESS_TOKEN não configurado. Configure a variável de ambiente para habilitar a sincronização real.',
    };
  }

  let files;
  try {
    const result = await listPdfFilesInFolder(DEFAULT_BIBLIOTECAS_FOLDER_ID, accessToken);
    files = result.files;
  } catch (err) {
    return { error: `Erro ao listar arquivos do Drive: ${(err as Error).message}` };
  }

  if (files.length === 0) {
    return { success: true, imported: 0, message: 'Nenhum PDF encontrado na pasta.' };
  }

  // Buscar fontes já existentes para evitar duplicatas
  const { data: existingSources } = await supabase
    .from('knowledge_sources')
    .select('drive_file_id')
    .eq('organization_id', membership.organization_id)
    .not('drive_file_id', 'is', null);

  const existingIds = new Set((existingSources ?? []).map((s) => s.drive_file_id));

  const newSources = files
    .filter((f) => !existingIds.has(f.id))
    .map((f) => ({
      organization_id: membership.organization_id,
      title: f.name.replace(/\.pdf$/i, ''),
      source_type: 'book' as const,
      rights_status: 'pending_review' as const,
      processing_status: 'pending' as const,
      drive_file_id: f.id,
      drive_url: f.webViewLink,
      language: 'pt-BR',
    }));

  if (newSources.length === 0) {
    return { success: true, imported: 0, message: 'Todos os livros já estão cadastrados.' };
  }

  const { error: insertError } = await supabase
    .from('knowledge_sources')
    .insert(newSources);

  if (insertError) {
    return { error: `Erro ao importar livros: ${insertError.message}` };
  }

  // Simular geração de knowledge cards para cada fonte importada
  for (const source of newSources) {
    const { data: insertedSource } = await supabase
      .from('knowledge_sources')
      .select('id')
      .eq('drive_file_id', source.drive_file_id)
      .eq('organization_id', membership.organization_id)
      .single();

    if (insertedSource) {
      await supabase.from('source_knowledge_cards').insert({
        source_id: insertedSource.id,
        card_type: 'summary',
        content_jsonb: {
          title: `Resumo automático: ${source.title}`,
          body: `Conteúdo extraído automaticamente do livro "${source.title}". Em produção, este texto será gerado pela Claude API após extração do PDF via Google Drive.`,
          key_concepts: ['Conceito 1', 'Conceito 2', 'Conceito 3'],
        },
        version: 1,
        status: 'draft',
      });

      // Atualizar status de processamento
      await supabase
        .from('knowledge_sources')
        .update({ processing_status: 'completed' })
        .eq('id', insertedSource.id);
    }
  }

  revalidatePath('/dashboard/sources');
  return { success: true, imported: newSources.length };
}