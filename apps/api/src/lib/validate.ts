import { fieldErrors } from '@mf/shared';
import type { z } from 'zod';
import { AppError } from './errors';

export class ValidationError extends AppError {
  constructor(readonly fields: Record<string, string>) {
    super(400, 'VALIDATION_ERROR', 'Confira os dados informados.');
  }
}

/** Valida a entrada com o mesmo schema usado no site; erro vira 400 com mensagens por campo. */
export function validate<T extends z.ZodType>(schema: T, data: unknown): z.output<T> {
  const result = schema.safeParse(data);
  if (!result.success) throw new ValidationError(fieldErrors(result.error));
  return result.data;
}
