import { Router, type Request } from 'express';
import { createStrategySchema, updateStrategySchema } from '@solupaes/shared';
import { prisma } from '../lib/prisma.js';
import { NotFound } from '../lib/errors.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { authJWT } from '../middleware/authJWT.js';
import { requireAuth, requireGestor } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { audit } from '../middleware/auditLog.js';

const router = Router();
router.use(authJWT, requireAuth);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const items = await prisma.strategy.findMany({
      where: status ? { status: status as 'PROPOSED' } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        client: { select: { fantasyName: true, city: true } },
        createdBy: { select: { name: true } },
      },
    });
    const data = items.map((s) => ({
      id: s.id,
      clientId: s.clientId,
      clientFantasyName: s.client.fantasyName,
      visitId: s.visitId,
      title: s.title,
      description: s.description,
      type: s.type,
      status: s.status,
      followUpAt: s.followUpAt?.toISOString() ?? null,
      createdById: s.createdById,
      createdByName: s.createdBy.name,
      generatedByAi: s.generatedByAi,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    }));
    res.json({ success: true, data });
  }),
);

router.post(
  '/',
  requireGestor,
  validate(createStrategySchema),
  asyncHandler(async (req: Request, res) => {
    const strategy = await prisma.strategy.create({
      data: {
        ...req.body,
        followUpAt: req.body.followUpAt ? new Date(req.body.followUpAt) : null,
        createdById: req.user!.sub,
      },
    });
    await audit(req, 'strategy.create', 'Strategy', strategy.id);
    res.status(201).json({ success: true, data: strategy });
  }),
);

router.patch(
  '/:id',
  requireGestor,
  validate(updateStrategySchema),
  asyncHandler(async (req: Request, res) => {
    const exists = await prisma.strategy.findUnique({ where: { id: req.params.id } });
    if (!exists) throw NotFound();
    const data = { ...req.body };
    if (data.followUpAt !== undefined) {
      data.followUpAt = data.followUpAt ? new Date(data.followUpAt) : null;
    }
    const updated = await prisma.strategy.update({ where: { id: req.params.id }, data });
    await audit(req, 'strategy.update', 'Strategy', updated.id, { fields: Object.keys(req.body) });
    res.json({ success: true, data: updated });
  }),
);

export default router;
