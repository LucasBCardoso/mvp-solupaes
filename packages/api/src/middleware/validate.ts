import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny } from 'zod';
import { BadRequest } from '../lib/errors.js';

type Source = 'body' | 'query' | 'params';

export function validate(schema: ZodTypeAny, source: Source = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req[source]);
    if (!parsed.success) {
      return next(BadRequest('Dados inválidos', parsed.error.flatten()));
    }
    if (source === 'body') req.body = parsed.data;
    else if (source === 'query') Object.assign(req.query, parsed.data);
    else Object.assign(req.params, parsed.data);
    next();
  };
}
