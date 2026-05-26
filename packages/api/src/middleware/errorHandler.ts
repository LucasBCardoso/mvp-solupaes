import type { ErrorRequestHandler } from 'express';
import { HttpError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
    return;
  }

  const isProd = process.env.NODE_ENV === 'production';
  const message = err instanceof Error ? err.message : 'Erro interno';

  logger.error({ err, path: req.path, method: req.method }, 'Unhandled error');

  res.status(500).json({
    success: false,
    error: isProd ? 'Erro interno' : message,
  });
};

export const notFoundHandler = (req: import('express').Request, res: import('express').Response) => {
  res.status(404).json({ success: false, error: `Rota não encontrada: ${req.method} ${req.path}` });
};
