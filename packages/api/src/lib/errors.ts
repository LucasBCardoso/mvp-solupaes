export class HttpError extends Error {
  statusCode: number;
  details?: unknown;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.name = 'HttpError';
  }
}

export const BadRequest = (message = 'Requisição inválida', details?: unknown) =>
  new HttpError(400, message, details);
export const Unauthorized = (message = 'Não autenticado') => new HttpError(401, message);
export const Forbidden = (message = 'Sem permissão') => new HttpError(403, message);
export const NotFound = (message = 'Não encontrado') => new HttpError(404, message);
export const Conflict = (message = 'Conflito') => new HttpError(409, message);
export const TooManyRequests = (message = 'Muitas requisições') => new HttpError(429, message);
