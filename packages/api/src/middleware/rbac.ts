import type { NextFunction, Request, Response } from 'express';
import type { Role } from '@solupaes/shared';
import { Forbidden, Unauthorized } from '../lib/errors.js';

export function requireRole(...allowed: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(Unauthorized());
    if (!allowed.includes(req.user.role)) return next(Forbidden('Papel sem permissão'));
    next();
  };
}

export const requireGestor = requireRole('ADMIN', 'GESTOR');
export const requireAuth = requireRole('ADMIN', 'GESTOR', 'REPRESENTANTE');
