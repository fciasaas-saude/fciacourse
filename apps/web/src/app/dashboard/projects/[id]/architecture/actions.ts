'use server';

import { createClient } from '@/lib/supabase/server';
import { createCourseArchitectureSchema, type CreateCourseArchitectureInput } from '@/lib/validations/architecture';
import { revalidatePath } from 'next/cache';

export async function generateArchitecture(projectId: string) {
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
    return { error: 'Permissão insuficiente para gerar arquitetura.' };
  }

  const { data: project, error: projectError } = await supabase
    .from('course_projects')
    .select('*, briefings(*)')
    .eq('id', projectId)
    .eq('organization_id', membership.organization_id)
    .single();

  if (projectError || !project) {
    return { error: 'Projeto não encontrado.' };
  }

  const briefing = project.briefings as unknown as {
    title: string;
    target_audience: string;
    desired_outcome: string;
    problem_statement: string;
    audience_level: string | null;
    estimated_duration: number | null;
  };

  const architectureData: CreateCourseArchitectureInput = {
    course_project_id: projectId,
    version: 1,
    title: `Arquitetura: ${briefing.title}`,
    subtitle: `Baseado em: ${briefing.problem_statement.substring(0, 60)}...`,
    promise: `Ao final deste curso, você será capaz de: ${briefing.desired_outcome}`,
    target_audience: briefing.target_audience,
    learning_outcomes: [
      {
        id: crypto.randomUUID(),
        description: `Compreender os fundamentos de ${briefing.target_audience}`,
        bloom_level: 'understand',
        assessment_method: 'quiz',
      },
      {
        id: crypto.randomUUID(),
        description: `Aplicar técnicas práticas para ${briefing.desired_outcome}`,
        bloom_level: 'apply',
        assessment_method: 'exercise',
      },
      {
        id: crypto.randomUUID(),
        description: `Analisar cenários reais relacionados a ${briefing.problem_statement.substring(0, 40)}`,
        bloom_level: 'analyze',
        assessment_method: 'project',
      },
    ],
    course_format: 'online',
    estimated_duration_minutes: briefing.estimated_duration ?? 480,
    final_assessment: {
      type: 'project',
      description: 'Projeto prático aplicando todos os conceitos aprendidos',
      criteria: [
        { name: 'Fundamentação teórica', weight: 30 },
        { name: 'Aplicação prática', weight: 40 },
        { name: 'Apresentação e clareza', weight: 30 },
      ],
      passing_score: 70,
    },
    structure_json: [
      {
        id: crypto.randomUUID(),
        title: 'Módulo 1: Fundamentos',
        description: 'Introdução aos conceitos essenciais',
        duration_minutes: 120,
        learning_outcomes: [],
        activities: [
          { type: 'video', title: 'Aula inaugural', duration_minutes: 30 },
          { type: 'reading', title: 'Leitura complementar', duration_minutes: 45 },
          { type: 'quiz', title: 'Quiz de fixação', duration_minutes: 15 },
        ],
      },
      {
        id: crypto.randomUUID(),
        title: 'Módulo 2: Prática Aplicada',
        description: 'Exercícios e estudos de caso',
        duration_minutes: 180,
        learning_outcomes: [],
        activities: [
          { type: 'video', title: 'Demonstração prática', duration_minutes: 45 },
          { type: 'exercise', title: 'Exercício guiado', duration_minutes: 60 },
          { type: 'discussion', title: 'Fórum de dúvidas', duration_minutes: 30 },
        ],
      },
      {
        id: crypto.randomUUID(),
        title: 'Módulo 3: Projeto Final',
        description: 'Consolidação e avaliação',
        duration_minutes: 180,
        learning_outcomes: [],
        activities: [
          { type: 'project', title: 'Desenvolvimento do projeto', duration_minutes: 120 },
          { type: 'project', title: 'Apresentação final', duration_minutes: 30 },
        ],
      },
    ],
    status: 'draft',
  };

  const parsed = createCourseArchitectureSchema.safeParse(architectureData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { error: insertError } = await supabase
    .from('course_architectures')
    .insert(parsed.data);

  if (insertError) {
    return { error: `Erro ao salvar arquitetura: ${insertError.message}` };
  }

  revalidatePath(`/dashboard/projects/${projectId}/architecture`);
  return { success: true };
}

export async function getArchitecture(projectId: string) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { architecture: null, error: 'Usuário não autenticado.' };
  }

  const { data: membership, error: memberError } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .single();

  if (memberError || !membership) {
    return { architecture: null, error: 'Usuário não pertence a nenhuma organização.' };
  }

  const { data: project, error: projectError } = await supabase
    .from('course_projects')
    .select('id')
    .eq('id', projectId)
    .eq('organization_id', membership.organization_id)
    .single();

  if (projectError || !project) {
    return { architecture: null, error: 'Projeto não encontrado.' };
  }

  const { data, error } = await supabase
    .from('course_architectures')
    .select('*')
    .eq('course_project_id', projectId)
    .order('version', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    return { architecture: null, error: error.message };
  }

  return { architecture: data ?? null };
}