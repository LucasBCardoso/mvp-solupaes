import type { Request } from 'express';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';

export async function audit(
  req: Request,
  action: string,
  entity?: string,
  entityId?: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: req.user?.sub,
        action,
        entity,
        entityId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']?.slice(0, 255),
        metadata: metadata as never,
      },
    });
  } catch (err) {
    logger.warn({ err, action, entity }, 'Falha ao gravar audit log');
  }
}
