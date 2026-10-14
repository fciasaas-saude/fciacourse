import { z } from 'zod';

export const sourceTypeSchema = z.enum([
  'book',
  'article',
  'report',
  'video',
  'podcast',
  'internal_document',
  'legislation',
  'other',
]);

export const rightsStatusSchema = z.enum([
  'public_domain',
  'creative_commons',
  'licensed',
  'fair_use',
  'proprietary',
  'pending_review',
]);

export const processingStatusSchema = z.enum([
  'pending',
  'extracting',
  'generating_cards',
  'completed',
  'failed',
  'needs_review',
]);

export const createKnowledgeSourceSchema = z.object({
  source_type: sourceTypeSchema,
  title: z.string().min(3, 'Título deve ter pelo menos 3 caracteres').max(500),
  author: z.string().max(300).optional().nullable(),
  publisher: z.string().max(300).optional().nullable(),
  publication_year: z
    .number()
    .int()
    .min(1900)
    .max(new Date().getFullYear())
    .optional()
    .nullable(),
  language: z.string().min(2).max(10).default('pt-BR'),
  drive_file_id: z.string().max(255).optional().nullable(),
  drive_url: z.string().url('URL inválida').max(1000).optional().nullable(),
  storage_path: z.string().max(1000).optional().nullable(),
  rights_status: rightsStatusSchema.default('pending_review'),
  permission_notes: z.string().max(2000).optional().nullable(),
  classification: z.string().max(200).optional().nullable(),
  processing_status: processingStatusSchema.optional().default('pending'),
  page_count: z.number().int().positive().optional().nullable(),
  checksum: z.string().max(128).optional().nullable(),
});

export const updateKnowledgeSourceSchema = createKnowledgeSourceSchema.partial();

export type CreateKnowledgeSourceInput = z.infer<typeof createKnowledgeSourceSchema>;
export type UpdateKnowledgeSourceInput = z.infer<typeof updateKnowledgeSourceSchema>;