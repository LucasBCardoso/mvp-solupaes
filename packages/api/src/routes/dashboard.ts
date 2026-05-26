import { Router, type Request } from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { authJWT } from '../middleware/authJWT.js';
import { requireAuth } from '../middleware/rbac.js';

const router = Router();
router.use(authJWT, requireAuth);

const startOfWeekUTC = (d: Date): Date => {
  const day = d.getUTCDay();
  const diff = (day + 6) % 7;
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  monday.setUTCDate(monday.getUTCDate() - diff);
  return monday;
};

router.get(
  '/summary',
  asyncHandler(async (req: Request, res) => {
    const isRep = req.user!.role === 'REPRESENTANTE';
    const repFilter = isRep ? { representativeId: req.user!.sub } : {};

    const now = new Date();
    const thisWeekStart = startOfWeekUTC(now);
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setUTCDate(lastWeekStart.getUTCDate() - 7);

    const [totalVisits, byClass, thisWeekCount, lastWeekCount, scoreAgg, pendingStrategies, topOpportunities] =
      await Promise.all([
        prisma.visit.count({ where: repFilter }),
        prisma.visit.groupBy({
          by: ['classification'],
          where: repFilter,
          _count: { classification: true },
        }),
        prisma.visit.count({ where: { ...repFilter, visitedAt: { gte: thisWeekStart } } }),
        prisma.visit.count({
          where: { ...repFilter, visitedAt: { gte: lastWeekStart, lt: thisWeekStart } },
        }),
        prisma.visit.aggregate({ where: repFilter, _avg: { viabilityScore: true } }),
        prisma.strategy.count({ where: { status: { in: ['PROPOSED', 'IN_PROGRESS'] } } }),
        prisma.visit.findMany({
          where: { ...repFilter, viabilityScore: { gte: 70 } },
          orderBy: { visitedAt: 'desc' },
          take: 5,
          include: { representative: { select: { name: true } } },
        }),
      ]);

    const classA = byClass.find((c) => c.classification === 'A')?._count.classification ?? 0;
    const classB = byClass.find((c) => c.classification === 'B')?._count.classification ?? 0;
    const classC = byClass.find((c) => c.classification === 'C')?._count.classification ?? 0;

    const weekDelta =
      lastWeekCount === 0
        ? thisWeekCount > 0
          ? 100
          : 0
        : Math.round(((thisWeekCount - lastWeekCount) / lastWeekCount) * 100);

    res.json({
      success: true,
      data: {
        totalVisits,
        visitsThisWeek: thisWeekCount,
        weekDelta,
        classA,
        classB,
        classC,
        avgScore: Math.round(scoreAgg._avg.viabilityScore ?? 0),
        pendingStrategies,
        topOpportunities: topOpportunities.map((v) => ({
          id: v.id,
          fantasyName: v.fantasyName,
          observations: v.observations,
          viabilityScore: v.viabilityScore,
          classification: v.classification,
          representativeName: v.representative.name,
          visitedAt: v.visitedAt.toISOString(),
        })),
      },
    });
  }),
);

router.get(
  '/map',
  asyncHandler(async (req: Request, res) => {
    const isRep = req.user!.role === 'REPRESENTANTE';
    const where = {
      lat: { not: null },
      lng: { not: null },
      ...(isRep ? { representativeId: req.user!.sub } : {}),
    };
    const visits = await prisma.visit.findMany({
      where,
      select: {
        id: true,
        lat: true,
        lng: true,
        fantasyName: true,
        classification: true,
        viabilityScore: true,
        visitedAt: true,
      },
      orderBy: { visitedAt: 'desc' },
      take: 2000,
    });
    res.json({ success: true, data: visits });
  }),
);

export default router;
