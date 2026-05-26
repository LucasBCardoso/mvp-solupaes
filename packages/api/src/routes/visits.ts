import { Router, type Request } from 'express';
import {
  createVisitSchema,
  listVisitsQuerySchema,
  syncVisitsSchema,
  type CreateVisitInput,
} from '@solupaes/shared';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { NotFound, Forbidden } from '../lib/errors.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { authJWT } from '../middleware/authJWT.js';
import { requireAuth } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { audit } from '../middleware/auditLog.js';
import { scoreVisit } from '../services/scoreEngine.js';
import { generateStrategies } from '../services/strategyEngine.js';
import { presignFacadeDownload } from '../services/storageR2.js';
import { isStorageConfigured } from '../lib/env.js';

const router = Router();
router.use(authJWT, requireAuth);

const isRep = (req: Request) => req.user!.role === 'REPRESENTANTE';

async function buildVisitWhere(req: Request, q: Record<string, unknown>): Promise<Prisma.VisitWhereInput> {
  const where: Prisma.VisitWhereInput = {};
  if (isRep(req)) {
    where.representativeId = req.user!.sub;
  } else if (typeof q.representativeId === 'string') {
    where.representativeId = q.representativeId;
  }
  if (typeof q.classification === 'string') where.classification = q.classification as 'A' | 'B' | 'C';
  if (typeof q.status === 'string') where.status = q.status as 'SYNCED' | 'PENDING_REVIEW' | 'ARCHIVED';
  if (typeof q.fromDate === 'string' || typeof q.toDate === 'string') {
    where.visitedAt = {};
    if (typeof q.fromDate === 'string') (where.visitedAt as Prisma.DateTimeFilter).gte = new Date(q.fromDate);
    if (typeof q.toDate === 'string') (where.visitedAt as Prisma.DateTimeFilter).lte = new Date(q.toDate);
  }
  if (typeof q.geoBox === 'string') {
    const [minLng, minLat, maxLng, maxLat] = q.geoBox.split(',').map(Number);
    where.AND = [
      { lat: { gte: minLat } },
      { lat: { lte: maxLat } },
      { lng: { gte: minLng } },
      { lng: { lte: maxLng } },
    ];
  }
  return where;
}

async function serializeVisit(v: Awaited<ReturnType<typeof prisma.visit.findFirst>> & { representative?: { name: string } | null }) {
  if (!v) return null;
  let facadePhotoUrl: string | null = null;
  if (v.facadePhotoKey && isStorageConfigured) {
    try {
      facadePhotoUrl = await presignFacadeDownload(v.facadePhotoKey, 3600);
    } catch {
      facadePhotoUrl = null;
    }
  }
  return {
    id: v.id,
    clientId: v.clientId,
    representativeId: v.representativeId,
    representativeName: v.representative?.name ?? '',
    fantasyName: v.fantasyName,
    phone: v.phone,
    addressLine: v.addressLine,
    lat: v.lat,
    lng: v.lng,
    facadePhotoUrl,
    worksWithFrozen: v.worksWithFrozen,
    currentSupplier: v.currentSupplier,
    dailyVolume: v.dailyVolume,
    currentPrice: v.currentPrice,
    equipmentLent: v.equipmentLent,
    observations: v.observations,
    viabilityScore: v.viabilityScore,
    classification: v.classification,
    status: v.status,
    clientUuid: v.clientUuid,
    visitedAt: v.visitedAt.toISOString(),
    syncedAt: v.syncedAt.toISOString(),
  };
}

router.get(
  '/',
  validate(listVisitsQuerySchema, 'query'),
  asyncHandler(async (req: Request, res) => {
    const q = req.query as Record<string, unknown>;
    const page = Number(q.page) || 1;
    const limit = Number(q.limit) || 50;
    const where = await buildVisitWhere(req, q);

    const [items, total] = await Promise.all([
      prisma.visit.findMany({
        where,
        orderBy: { visitedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { representative: { select: { name: true } } },
      }),
      prisma.visit.count({ where }),
    ]);

    const data = await Promise.all(items.map(serializeVisit));
    res.json({ success: true, data, meta: { total, page, limit } });
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req: Request, res) => {
    const visit = await prisma.visit.findUnique({
      where: { id: req.params.id },
      include: { representative: { select: { name: true } } },
    });
    if (!visit) throw NotFound();
    if (isRep(req) && visit.representativeId !== req.user!.sub) throw NotFound();
    res.json({ success: true, data: await serializeVisit(visit) });
  }),
);

async function persistVisit(req: Request, body: CreateVisitInput) {
  const score = scoreVisit({
    worksWithFrozen: body.worksWithFrozen,
    dailyVolume: body.dailyVolume,
    currentPrice: body.currentPrice,
    equipmentLent: body.equipmentLent ?? [],
    hasFacadePhoto: !!body.facadePhotoKey,
    hasGps: body.lat != null && body.lng != null,
  });

  let clientId = body.clientId ?? null;
  if (!clientId) {
    const created = await prisma.client.create({
      data: {
        fantasyName: body.fantasyName,
        addressLine: body.addressLine,
        phone: body.phone,
        lat: body.lat ?? null,
        lng: body.lng ?? null,
        worksWithFrozen: body.worksWithFrozen,
        currentSupplier: body.currentSupplier,
      },
    });
    clientId = created.id;
  }

  const visit = await prisma.visit.upsert({
    where: { clientUuid: body.clientUuid },
    create: {
      clientId,
      representativeId: req.user!.sub,
      fantasyName: body.fantasyName,
      phone: body.phone,
      addressLine: body.addressLine,
      lat: body.lat ?? null,
      lng: body.lng ?? null,
      facadePhotoKey: body.facadePhotoKey,
      worksWithFrozen: body.worksWithFrozen,
      currentSupplier: body.currentSupplier,
      dailyVolume: body.dailyVolume,
      currentPrice: body.currentPrice,
      equipmentLent: body.equipmentLent ?? [],
      observations: body.observations,
      viabilityScore: score.score,
      classification: score.classification,
      status: 'SYNCED',
      clientUuid: body.clientUuid,
      visitedAt: new Date(body.visitedAt),
    },
    update: {
      observations: body.observations,
      viabilityScore: score.score,
      classification: score.classification,
    },
    include: { representative: { select: { name: true } } },
  });

  const proposals = await generateStrategies({
    fantasyName: body.fantasyName,
    worksWithFrozen: body.worksWithFrozen,
    dailyVolume: body.dailyVolume,
    currentPrice: body.currentPrice,
    equipmentLent: body.equipmentLent ?? [],
    hasFacadePhoto: !!body.facadePhotoKey,
    hasGps: body.lat != null && body.lng != null,
    observations: body.observations,
    viabilityScore: score.score,
  });

  await Promise.all(
    proposals.map((p) =>
      prisma.strategy.create({
        data: {
          clientId: clientId!,
          visitId: visit.id,
          title: p.title,
          description: p.description,
          type: p.type,
          status: 'PROPOSED',
          followUpAt: p.followUpDays ? new Date(Date.now() + p.followUpDays * 86400000) : null,
          createdById: req.user!.sub,
          generatedByAi: p.generatedByAi,
        },
      }),
    ),
  );

  await audit(req, 'visit.create', 'Visit', visit.id, {
    clientUuid: body.clientUuid,
    score: score.score,
    classification: score.classification,
  });

  return visit;
}

router.post(
  '/',
  validate(createVisitSchema),
  asyncHandler(async (req: Request, res) => {
    const visit = await persistVisit(req, req.body as CreateVisitInput);
    res.status(201).json({ success: true, data: await serializeVisit(visit) });
  }),
);

router.post(
  '/sync',
  validate(syncVisitsSchema),
  asyncHandler(async (req: Request, res) => {
    const { visits } = req.body as { visits: CreateVisitInput[] };
    if (isRep(req) === false && req.user!.role !== 'REPRESENTANTE' && req.user!.role !== 'GESTOR' && req.user!.role !== 'ADMIN') {
      throw Forbidden();
    }
    const results = [] as Array<{ clientUuid: string; ok: boolean; id?: string; error?: string }>;
    for (const v of visits) {
      try {
        const persisted = await persistVisit(req, v);
        results.push({ clientUuid: v.clientUuid, ok: true, id: persisted.id });
      } catch (err) {
        results.push({
          clientUuid: v.clientUuid,
          ok: false,
          error: err instanceof Error ? err.message : 'erro',
        });
      }
    }
    res.json({ success: true, data: results });
  }),
);

export default router;
