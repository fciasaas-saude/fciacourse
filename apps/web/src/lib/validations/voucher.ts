import { z } from 'zod';

export const voucherCodeSchema = z
  .string()
  .min(4, 'Código deve ter pelo menos 4 caracteres')
  .max(32, 'Código deve ter no máximo 32 caracteres')
  .regex(/^[A-Za-z0-9\-]+$/, 'Código deve conter apenas letras, números e hífens');

export const generateVoucherBatchSchema = z.object({
  batch_name: z
    .string()
    .min(2, 'Nome do lote é obrigatório')
    .max(100, 'Nome do lote muito longo'),
  quantity: z
    .number()
    .int()
    .min(1, 'Quantidade mínima: 1')
    .max(500, 'Quantidade máxima por lote: 500'),
  max_uses: z.number().int().min(1).max(1000).optional().default(1),
  course_id: z.string().uuid().optional().nullable(),
  expires_at: z.string().datetime().optional().nullable(),
});

export const redeemVoucherSchema = z.object({
  code: voucherCodeSchema,
});

export type GenerateVoucherBatchInput = z.infer<typeof generateVoucherBatchSchema>;
export type RedeemVoucherInput = z.infer<typeof redeemVoucherSchema>;