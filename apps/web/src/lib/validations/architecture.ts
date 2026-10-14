import { z } from 'zod';

export const architectureStatusSchema = z.enum(['draft', 'review', 'approved', 'archived']);

export const learningOutcomeSchema = z.object({
  id: z.string().uuid().optional().default(() => crypto.randomUUID()),
  description: z.string().min(5, 'Descrição do resultado deve ter pelo menos 5 caracteres'),
  bloom_level: z.enum(['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create']).optional(),
  assessment_method: z.string().max(200).optional(),
});

export const moduleActivitySchema = z.object({
  type: z.enum(['video', 'reading', 'quiz', 'exercise', 'discussion', 'project']),
  title: z.string().min(3, 'Título da atividade é obrigatório'),
  description: z.string().optional(),
  duration_minutes: z.number().int().positive().optional(),
});

export const moduleSchema = z.object({
  id: z.string().uuid().optional().default(() => crypto.randomUUID()),
  title: z.string().min(3, 'Título do módulo é obrigatório'),
  description: z.string().optional(),
  duration_minutes: z.number().int().positive().optional(),
  learning_outcomes: z.array(z.string()).default([]),
  resources: z.array(z.string()).optional(),
  activities: z.array(moduleActivitySchema).optional(),
});

export const assessmentCriterionSchema = z.object({
  name: z.string().min(3, 'Nome do critério é obrigatório'),
  weight: z.number().min(0).max(100),
  description: z.string().optional(),
});

export const finalAssessmentSchema = z.object({
  type: z.enum(['exam', 'project', 'portfolio', 'presentation', 'mixed']),
  description: z.string().min(10, 'Descrição da avaliação é obrigatória'),
  criteria: z.array(assessmentCriterionSchema).min(1, 'Pelo menos um critério é necessário'),
  passing_score: z.number().min(0).max(100).optional(),
});

export const createCourseArchitectureSchema = z.object({
  course_project_id: z.string().uuid('ID do projeto inválido'),
  version: z.number().int().positive().optional().default(1),
  title: z.string().min(3, 'Título deve ter pelo menos 3 caracteres').max(300),
  subtitle: z.string().max(500).optional().nullable(),
  promise: z.string().min(10, 'Promessa do curso deve ser descritiva'),
  target_audience: z.string().min(3, 'Público-alvo é obrigatório'),
  learning_outcomes: z.array(learningOutcomeSchema).min(1, 'Pelo menos um resultado de aprendizagem é necessário'),
  course_format: z.string().min(1).max(50).default('online'),
  estimated_duration_minutes: z.number().int().positive('Duração deve ser positiva').optional().nullable(),
  final_assessment: finalAssessmentSchema,
  structure_json: z.array(moduleSchema).min(1, 'Pelo menos um módulo é necessário'),
  status: architectureStatusSchema.optional().default('draft'),
});

export const updateCourseArchitectureSchema = createCourseArchitectureSchema.partial().omit({ course_project_id: true });

export type CreateCourseArchitectureInput = z.infer<typeof createCourseArchitectureSchema>;
export type UpdateCourseArchitectureInput = z.infer<typeof updateCourseArchitectureSchema>;
export type LearningOutcomeInput = z.infer<typeof learningOutcomeSchema>;
export type ModuleInput = z.infer<typeof moduleSchema>;
export type FinalAssessmentInput = z.infer<typeof finalAssessmentSchema>;