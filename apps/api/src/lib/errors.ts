/** Erro de negócio com status HTTP e mensagem que pode ser exibida à cliente. */
export class AppError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export const notFound = (message: string) => new AppError(404, 'NOT_FOUND', message);
export const unauthorized = (message = 'Faça login para continuar.') => new AppError(401, 'UNAUTHORIZED', message);
export const forbidden = (message = 'Você não tem permissão para esta ação.') => new AppError(403, 'FORBIDDEN', message);
export const conflict = (code: string, message: string) => new AppError(409, code, message);
