'use server';

import { createClient } from '@/lib/supabase/server';
import { assessmentSubmissionSchema, MIN_PASSING_SCORE } from '@/lib/validations/assessment';
import { revalidatePath } from 'next/cache';

export async function submitAssessment(formData: FormData) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: 'Usuário não autenticado.' };
  }

  const enrollmentId = formData.get('enrollment_id') as string;
  const courseId = formData.get('course_id') as string;
  const moduleId = formData.get('module_id') as string | null;
  const answersRaw = formData.get('answers') as string;

  let answers: Record<string, unknown> = {};
  try {
    answers = JSON.parse(answersRaw);
  } catch {
    return { error: 'Formato de respostas inválido.' };
  }

  const parsed = assessmentSubmissionSchema.safeParse({
    enrollment_id: enrollmentId,
    course_id: courseId,
    module_id: moduleId || null,
    answers,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  // Verificar se o usuário é dono da matrícula
  const { data: enrollment, error: enrollError } = await supabase
    .from('enrollments')
    .select('id, organization_id')
    .eq('id', enrollmentId)
    .eq('user_id', user.id)
    .single();

  if (enrollError || !enrollment) {
    return { error: 'Matrícula não encontrada ou acesso negado.' };
  }

  // Buscar questões dos bancos da organização
  // Nota: Em produção, usar RPC ou join mais preciso para buscar questões do bank correto
  // Aqui simplificamos buscando todas as questões da org e filtrando no app
  const { data: allQuestions, error: qError } = await supabase
    .from('questions')
    .select('id, correct_answer, points, question_type, bank_id')
    .in('bank_id', (
      await supabase
        .from('question_banks')
        .select('id')
        .eq('organization_id', enrollment.organization_id)
    ).data?.map(qb => qb.id) ?? []);

  if (qError) {
    return { error: `Erro ao buscar questões: ${qError.message}` };
  }

  // Correção server-side
  let totalPoints = 0;
  let earnedPoints = 0;
  let correctCount = 0;

  for (const question of allQuestions ?? []) {
    totalPoints += question.points;
    const userAnswer = answers[question.id];

    // Lógica simplificada de correção para multiple_choice e true_false
    if (question.question_type === 'multiple_choice' || question.question_type === 'true_false') {
      if (JSON.stringify(userAnswer) === JSON.stringify(question.correct_answer)) {
        earnedPoints += question.points;
        correctCount++;
      }
    }
    // open_ended e matching requerem correção manual ou IA (não implementado aqui)
  }

  const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
  const passed = score >= MIN_PASSING_SCORE;

  // Contar tentativa anterior
  const { count } = await supabase
    .from('assessment_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('enrollment_id', enrollmentId)
    .eq('course_id', courseId);

  const attemptNumber = (count ?? 0) + 1;

  const { error: insertError } = await supabase
    .from('assessment_attempts')
    .insert({
      enrollment_id: enrollmentId,
      course_id: courseId,
      module_id: moduleId || null,
      attempt_number: attemptNumber,
      total_questions: allQuestions?.length ?? 0,
      correct_answers: correctCount,
      score,
      passed,
      answers,
      submitted_at: new Date().toISOString(),
      graded_at: new Date().toISOString(),
      graded_by: user.id,
    });

  if (insertError) {
    return { error: `Erro ao salvar tentativa: ${insertError.message}` };
  }

  revalidatePath(`/dashboard/courses/${courseId}/assessment`);
  return { success: true, score, passed, attemptNumber };
}

export async function getAssessmentResults(courseId: string) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { attempts: [], error: 'Usuário não autenticado.' };
  }

  const { data: enrollment, error: enrollError } = await supabase
    .from('enrollments')
    .select('id')
    .eq('course_id', courseId)
    .eq('user_id', user.id)
    .single();

  if (enrollError || !enrollment) {
    return { attempts: [], error: 'Matrícula não encontrada.' };
  }

  const { data, error } = await supabase
    .from('assessment_attempts')
    .select('*')
    .eq('enrollment_id', enrollment.id)
    .order('attempt_number', { ascending: false });

  if (error) {
    return { attempts: [], error: error.message };
  }

  return { attempts: data ?? [] };
}