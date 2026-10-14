import { z } from 'zod';

export const questionTypeSchema = z.enum(['multiple_choice', 'true_false', 'open_ended', 'matching']);
export const questionDifficultySchema = z.enum(['easy', 'medium', 'hard']);
export const enrollmentStatusSchema = z.enum(['active', 'completed', 'dropped', 'suspended']);
export const lessonProgressStatusSchema = z.enum(['not_started', 'in_progress', 'completed']);

export const createQuestionBankSchema = z.object({
  organization_id: z.string().uuid('ID da organização inválido'),
  course_id: z.string().uuid().optional().nullable(),
  module_id: z.string().uuid().optional().nullable(),
  title: z.string().min(3, 'Título do banco é obrigatório').max(300),
  description: z.string().optional().nullable(),
});

export const createQuestionSchema = z.object({
  bank_id: z.string().uuid('ID do banco inválido'),
  question_type: questionTypeSchema,
  content: z.string().min(5, 'Conteúdo da questão é obrigatório'),
  options: z.array(z.string()).optional().default([]),
  correct_answer: z.unknown(),
  explanation: z.string().optional().nullable(),
  points: z.number().positive('Pontos devem ser positivos').default(1),
  difficulty: questionDifficultySchema.optional().nullable(),
  tags: z.array(z.string()).optional().default([]),
});

export const updateQuestionSchema = createQuestionSchema.partial().omit({ bank_id: true });

export const assessmentSubmissionSchema = z.object({
  enrollment_id: z.string().uuid('ID da matrícula inválido'),
  course_id: z.string().uuid('ID do curso inválido'),
  module_id: z.string().uuid().optional().nullable(),
  answers: z.record(z.string(), z.unknown()),
});

export const MIN_PASSING_SCORE = 70;

export const certificateIssueSchema = z.object({
  enrollment_id: z.string().uuid('ID da matrícula inválido'),
  course_id: z.string().uuid('ID do curso inválido'),
  organization_id: z.string().uuid('ID da organização inválido'),
  final_score: z.number().min(MIN_PASSING_SCORE, `Nota mínima para certificado é ${MIN_PASSING_SCORE}%`).max(100),
  completion_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD'),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
  expires_at: z.string().datetime().optional().nullable(),
});

export type CreateQuestionBankInput = z.infer<typeof createQuestionBankSchema>;
export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;
export type UpdateQuestionInput = z.infer<typeof updateQuestionSchema>;
export type AssessmentSubmissionInput = z.infer<typeof assessmentSubmissionSchema>;
export type CertificateIssueInput = z.infer<typeof certificateIssueSchema>;