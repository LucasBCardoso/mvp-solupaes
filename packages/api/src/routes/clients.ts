import { Router, type Request } from 'express';
import { createClientSchema, updateClientSchema } from '@solupaes/shared';
import { prisma } from '../lib/prisma.js';
import { NotFound } from '../lib/errors.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { authJWT } from '../middleware/authJWT.js';
import { requireAuth } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { audit } from '../middleware/auditLog.js';

const router = Router();
router.use(authJWT, requireAuth);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const clients = await prisma.client.findMany({
      where: search
        ? {
            OR: [
              { fantasyName: { contains: search, mode: 'insensitive' } },
              { socialReason: { contains: search, mode: 'insensitive' } },
              { city: { contains: search, mode: 'insensitive' } },
            ],
          }
        : undefined,
      orderBy: { updatedAt: 'desc' },
      take: 200,
    });
    res.json({ success: true, data: clients });
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const client = await prisma.client.findUnique({
      where: { id: req.params.id },
      include: {
        visits: { orderBy: { visitedAt: 'desc' }, take: 50 },
        strategies: { orderBy: { createdAt: 'desc' }, take: 50 },
      },
    });
    if (!client) throw NotFound('Cliente não encontrado');
    res.json({ success: true, data: client });
  }),
);

router.post(
  '/',
  validate(createClientSchema),
  asyncHandler(async (req: Request, res) => {
    const client = await prisma.client.create({ data: req.body });
    await audit(req, 'client.create', 'Client', client.id);
    res.status(201).json({ success: true, data: client });
  }),
);

router.patch(
  '/:id',
  validate(updateClientSchema),
  asyncHandler(async (req: Request, res) => {
    const exists = await prisma.client.findUnique({ where: { id: req.params.id } });
    if (!exists) throw NotFound('Cliente não encontrado');
    const updated = await prisma.client.update({ where: { id: req.params.id }, data: req.body });
    await audit(req, 'client.update', 'Client', req.params.id, { fields: Object.keys(req.body) });
    res.json({ success: true, data: updated });
  }),
);

export default router;
