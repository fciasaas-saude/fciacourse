import { z } from 'zod';

export const moduleStatusSchema = z.enum(['draft', 'review', 'approved', 'archived']);
export const moduleVersionStatusSchema = z.enum(['draft', 'review', 'approved', 'rejected']);

export const theoryBlockSchema = z.object({
  type: z.literal('theory'),
  title: z.string().min(3, 'Título do bloco é obrigatório'),
  content: z.string().min(10, 'Conteúdo teórico deve ter pelo menos 10 caracteres'),
  key_points: z.array(z.string()).optional(),
});

export const exampleBlockSchema = z.object({
  type: z.literal('example'),
  title: z.string().min(3),
  scenario: z.string().min(5, 'Cenário é obrigatório'),
  solution: z.string().optional(),
  analysis: z.string().optional(),
});

export const activityBlockSchema = z.object({
  type: z.literal('activity'),
  title: z.string().min(3),
  instructions: z.string().min(10, 'Instruções são obrigatórias'),
  expected_output: z.string().optional(),
  duration_minutes: z.number().int().positive().optional(),
});

export const commonMistakeBlockSchema = z.object({
  type: z.literal('common_mistake'),
  title: z.string().min(3),
  mistake: z.string().min(5, 'Descrição do erro é obrigatória'),
  correction: z.string().min(5, 'Correção é obrigatória'),
  prevention_tip: z.string().optional(),
});

export const checklistBlockSchema = z.object({
  type: z.literal('checklist'),
  title: z.string().min(3),
  items: z.array(z.string()).min(1, 'Checklist deve ter pelo menos um item'),
});

export const quizQuestionSchema = z.object({
  id: z.string().uuid().optional().default(() => crypto.randomUUID()),
  question: z.string().min(5, 'Pergunta é obrigatória'),
  options: z.array(z.string()).min(2, 'Mínimo de 2 opções').max(6),
  correct_answer_index: z.number().int().min(0),
  explanation: z.string().optional(),
});

export const quizBlockSchema = z.object({
  type: z.literal('quiz'),
  title: z.string().min(3),
  questions: z.array(quizQuestionSchema).min(1, 'Quiz deve ter pelo menos uma questão'),
  passing_score: z.number().min(0).max(100).optional(),
});

export const contentBlockSchema = z.discriminatedUnion('type', [
  theoryBlockSchema,
  exampleBlockSchema,
  activityBlockSchema,
  commonMistakeBlockSchema,
  checklistBlockSchema,
  quizBlockSchema,
]);

export const moduleContentSchema = z.object({
  introduction: z.string().optional(),
  blocks: z.array(contentBlockSchema).min(1, 'Módulo deve ter pelo menos um bloco de conteúdo'),
  summary: z.string().optional(),
  additional_resources: z.array(z.string()).optional(),
});

export const generationMetadataSchema = z.object({
  model_name: z.string().optional(),
  prompt_version: z.string().optional(),
  source_ids: z.array(z.string().uuid()).optional(),
  architecture_id: z.string().uuid().optional(),
  generated_at: z.string().datetime().optional(),
  iterations: z.number().int().nonnegative().optional(),
});

export const createCourseModuleSchema = z.object({
  course_id: z.string().uuid('ID do curso inválido'),
  module_number: z.number().int().positive('Número do módulo deve ser positivo'),
  title: z.string().min(3, 'Título do módulo é obrigatório').max(300),
  description: z.string().optional().nullable(),
  learning_objective: z.string().min(10, 'Objetivo de aprendizagem é obrigatório'),
  status: moduleStatusSchema.optional().default('draft'),
  estimated_duration_minutes: z.number().int().positive().optional().nullable(),
  sort_order: z.number().int().nonnegative().optional().default(0),
});

export const updateCourseModuleSchema = createCourseModuleSchema.partial().omit({ course_id: true });

export const createModuleVersionSchema = z.object({
  module_id: z.string().uuid('ID do módulo inválido'),
  version: z.number().int().positive().optional().default(1),
  content_jsonb: moduleContentSchema,
  content_markdown: z.string().optional().nullable(),
  generation_metadata: generationMetadataSchema.optional().default({}),
  quality_score: z.number().min(0).max(100).optional().nullable(),
  originality_score: z.number().min(0).max(100).optional().nullable(),
  status: moduleVersionStatusSchema.optional().default('draft'),
});

export const updateModuleVersionSchema = createModuleVersionSchema.partial().omit({ module_id: true });

export type CreateCourseModuleInput = z.infer<typeof createCourseModuleSchema>;
export type UpdateCourseModuleInput = z.infer<typeof updateCourseModuleSchema>;
export type CreateModuleVersionInput = z.infer<typeof createModuleVersionSchema>;
export type UpdateModuleVersionInput = z.infer<typeof updateModuleVersionSchema>;
export type ModuleContentInput = z.infer<typeof moduleContentSchema>;
export type ContentBlockInput = z.infer<typeof contentBlockSchema>;