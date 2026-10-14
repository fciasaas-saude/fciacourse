import { z } from 'zod';

export const briefingStatusSchema = z.enum(['draft', 'review', 'approved', 'archived']);

export const createBriefingSchema = z.object({
  title: z.string().min(3, 'Título deve ter pelo menos 3 caracteres').max(255),
  problem_statement: z.string().min(10, 'Descreva o problema com pelo menos 10 caracteres'),
  target_audience: z.string().min(3, 'Público-alvo é obrigatório'),
  desired_outcome: z.string().min(10, 'Resultado desejado deve ser descritivo'),
  audience_level: z.string().max(100).optional().nullable(),
  requested_format: z.string().max(100).optional().nullable(),
  estimated_duration: z.number().int().positive('Duração deve ser positiva em minutos').optional().nullable(),
  communication_tone: z.string().max(100).optional().nullable(),
  restrictions: z.string().optional().nullable(),
  status: briefingStatusSchema.optional().default('draft'),
});

export const updateBriefingSchema = createBriefingSchema.partial();

export type CreateBriefingInput = z.infer<typeof createBriefingSchema>;
export type UpdateBriefingInput = z.infer<typeof updateBriefingSchema>;

export const createCourseProjectSchema = z.object({
  briefing_id: z.string().uuid('ID do briefing inválido'),
  project_name: z.string().min(3, 'Nome do projeto deve ter pelo menos 3 caracteres').max(255),
  vertical: z.string().max(100).optional().nullable(),
  stage: z.string().min(1).max(50).default('planning'),
  priority: z.number().int().min(1).max(5).default(3),
  owner_id: z.string().uuid().optional().nullable(),
  budget_limit_cents: z.number().int().nonnegative('Orçamento não pode ser negativo').optional().nullable(),
  token_budget: z.number().int().nonnegative('Budget de tokens não pode ser negativo').optional().nullable(),
});

export const updateCourseProjectSchema = createCourseProjectSchema.partial().omit({ briefing_id: true });

export type CreateCourseProjectInput = z.infer<typeof createCourseProjectSchema>;
export type UpdateCourseProjectInput = z.infer<typeof updateCourseProjectSchema>;