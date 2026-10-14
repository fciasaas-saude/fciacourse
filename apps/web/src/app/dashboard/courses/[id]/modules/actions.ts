'use server';

import { createClient } from '@/lib/supabase/server';
import { createCourseModuleSchema, createModuleVersionSchema, type CreateCourseModuleInput, type CreateModuleVersionInput } from '@/lib/validations/module';
import { revalidatePath } from 'next/cache';

export async function generateModule(courseId: string, moduleNumber: number) {
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

  const allowedRoles = ['content_director', 'editor'];
  if (!allowedRoles.includes(membership.role)) {
    return { error: 'Permissão insuficiente para gerar módulo.' };
  }

  // Verificar se o curso pertence à org do usuário
  const { data: course, error: courseError } = await supabase
    .from('course_architectures')
    .select('*, course_projects!inner(organization_id, project_name)')
    .eq('id', courseId)
    .eq('course_projects.organization_id', membership.organization_id)
    .single();

  if (courseError || !course) {
    return { error: 'Curso não encontrado ou acesso negado.' };
  }

  const projectName = (course.course_projects as { project_name: string }).project_name;

  // Criar o módulo base
  const moduleData: CreateCourseModuleInput = {
    course_id: courseId,
    module_number: moduleNumber,
    title: `Módulo ${moduleNumber}: ${projectName}`,
    description: `Conteúdo gerado automaticamente pelo Module Factory FCIA`,
    learning_objective: `Dominar os conceitos fundamentais do módulo ${moduleNumber} aplicando a metodologia Aprender, Aplicar, Evoluir`,
    status: 'draft',
    estimated_duration_minutes: 120,
    sort_order: moduleNumber - 1,
  };

  const parsedModule = createCourseModuleSchema.safeParse(moduleData);
  if (!parsedModule.success) {
    return { error: parsedModule.error.issues[0].message };
  }

  const { data: insertedModule, error: moduleInsertError } = await supabase
    .from('course_modules')
    .insert(parsedModule.data)
    .select('id')
    .single();

  if (moduleInsertError || !insertedModule) {
    return { error: `Erro ao criar módulo: ${moduleInsertError?.message}` };
  }

  // Gerar versão inicial do conteúdo seguindo FCIA: Aprender, Aplicar, Evoluir
  const versionData: CreateModuleVersionInput = {
    module_id: insertedModule.id,
    version: 1,
    content_jsonb: {
      introduction: `Bem-vindo ao Módulo ${moduleNumber}. Neste módulo, você irá percorrer o ciclo completo da metodologia FCIA.`,
      blocks: [
        {
          type: 'theory',
          title: 'Aprender: Fundamentos Teóricos',
          content: `## Conceitos Essenciais\n\nNesta seção, apresentamos os fundamentos teóricos necessários para compreender o tema deste módulo.\n\n### Pontos-Chave\n- Compreensão dos princípios base\n- Contextualização histórica e prática\n- Framework conceitual aplicado`,
          key_points: ['Princípios fundamentais', 'Contexto de aplicação', 'Framework teórico'],
        },
        {
          type: 'example',
          title: 'Exemplo Prático Ilustrativo',
          scenario: `Imagine que você precisa aplicar os conceitos do Módulo ${moduleNumber} em um projeto real com prazo de 2 semanas.`,
          solution: 'Utilize o framework apresentado na teoria para estruturar sua abordagem em três fases: diagnóstico, implementação e validação.',
          analysis: 'Este exemplo demonstra como a teoria se conecta diretamente com a prática profissional.',
        },
        {
          type: 'activity',
          title: 'Aplicar: Exercício Guiado',
          instructions: 'Com base no exemplo anterior, desenvolva um plano de ação para um cenário similar em seu contexto profissional. Documente cada etapa utilizando o template fornecido.',
          expected_output: 'Documento de plano de ação com pelo menos 5 etapas definidas.',
          duration_minutes: 45,
        },
        {
          type: 'common_mistake',
          title: 'Erro Comum: Pular a Fase de Diagnóstico',
          mistake: 'Muitos profissionais iniciam a implementação sem realizar um diagnóstico adequado do cenário atual.',
          correction: 'Sempre dedique pelo menos 20% do tempo total para análise e diagnóstico antes de implementar soluções.',
          prevention_tip: 'Utilize o checklist de diagnóstico disponível nos recursos adicionais antes de prosseguir.',
        },
        {
          type: 'checklist',
          title: 'Evoluir: Checklist de Validação',
          items: [
            'Revisar todos os conceitos teóricos apresentados',
            'Completar o exercício guiado com documentação',
            'Validar resultados contra critérios de qualidade',
            'Documentar aprendizados e pontos de melhoria',
            'Planejar próximos passos de evolução contínua',
          ],
        },
        {
          type: 'quiz',
          title: 'Avaliação de Fixação',
          questions: [
            {
              id: crypto.randomUUID(),
              question: 'Qual é a sequência correta da metodologia FCIA?',
              options: ['Aplicar, Aprender, Evoluir', 'Aprender, Aplicar, Evoluir', 'Evoluir, Aprender, Aplicar', 'Aprender, Evoluir, Aplicar'],
              correct_answer_index: 1,
              explanation: 'A metodologia FCIA segue a progressão natural: primeiro aprendemos os fundamentos, depois aplicamos na prática e finalmente evoluímos continuamente.',
            },
            {
              id: crypto.randomUUID(),
              question: 'Por que a fase de diagnóstico é importante antes da implementação?',
              options: ['Para cumprir requisitos burocráticos', 'Para garantir alinhamento entre teoria e contexto real', 'Para aumentar o tempo do projeto', 'Não é importante'],
              correct_answer_index: 1,
              explanation: 'O diagnóstico permite contextualizar a teoria na realidade específica do projeto, evitando soluções genéricas e ineficazes.',
            },
          ],
          passing_score: 70,
        },
      ],
      summary: `Neste módulo, você percorreu o ciclo completo da metodologia FCIA: aprendeu os fundamentos teóricos, aplicou em exercícios práticos e estabeleceu critérios para evolução contínua.`,
      additional_resources: [],
    },
    generation_metadata: {
      model_name: 'fcia-module-factory-v1',
      prompt_version: '1.0',
      architecture_id: courseId,
      generated_at: new Date().toISOString(),
      iterations: 1,
    },
    quality_score: null,
    originality_score: null,
    status: 'draft',
  };

  const parsedVersion = createModuleVersionSchema.safeParse(versionData);
  if (!parsedVersion.success) {
    return { error: parsedVersion.error.issues[0].message };
  }

  const { error: versionInsertError } = await supabase
    .from('module_versions')
    .insert(parsedVersion.data);

  if (versionInsertError) {
    return { error: `Erro ao salvar versão do módulo: ${versionInsertError.message}` };
  }

  revalidatePath(`/dashboard/courses/${courseId}/modules`);
  return { success: true, moduleId: insertedModule.id };
}

export async function getModules(courseId: string) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { modules: [], error: 'Usuário não autenticado.' };
  }

  const { data: membership, error: memberError } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .single();

  if (memberError || !membership) {
    return { modules: [], error: 'Usuário não pertence a nenhuma organização.' };
  }

  const { data, error } = await supabase
    .from('course_modules')
    .select('*')
    .eq('course_id', courseId)
    .order('sort_order', { ascending: true });

  if (error) {
    return { modules: [], error: error.message };
  }

  return { modules: data ?? [] };
}

export async function getModuleWithVersion(moduleId: string) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { module: null, version: null, error: 'Usuário não autenticado.' };
  }

  const { data: mod, error: modError } = await supabase
    .from('course_modules')
    .select('*')
    .eq('id', moduleId)
    .single();

  if (modError || !mod) {
    return { module: null, version: null, error: 'Módulo não encontrado.' };
  }

  const { data: ver, error: verError } = await supabase
    .from('module_versions')
    .select('*')
    .eq('module_id', moduleId)
    .order('version', { ascending: false })
    .limit(1)
    .single();

  if (verError && verError.code !== 'PGRST116') {
    return { module: mod, version: null, error: verError.message };
  }

  return { module: mod, version: ver ?? null };
}