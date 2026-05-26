import argon2 from 'argon2';
import { Router, type Request } from 'express';
import { createUserSchema, updateUserSchema } from '@solupaes/shared';
import { prisma } from '../lib/prisma.js';
import { Conflict, NotFound } from '../lib/errors.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { authJWT } from '../middleware/authJWT.js';
import { requireGestor } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { audit } from '../middleware/auditLog.js';

const router = Router();
router.use(authJWT, requireGestor);

const serialize = (u: {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'GESTOR' | 'REPRESENTANTE';
  active: boolean;
  createdAt: Date;
  lastLoginAt: Date | null;
}) => ({
  id: u.id,
  email: u.email,
  name: u.name,
  role: u.role,
  active: u.active,
  createdAt: u.createdAt.toISOString(),
  lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
});

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ success: true, data: users.map(serialize) });
  }),
);

router.post(
  '/',
  validate(createUserSchema),
  asyncHandler(async (req: Request, res) => {
    const { email, name, password, role } = req.body;
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) throw Conflict('E-mail já cadastrado');

    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    const user = await prisma.user.create({
      data: { email, name, role, passwordHash },
    });
    await audit(req, 'user.create', 'User', user.id, { role });
    res.status(201).json({ success: true, data: serialize(user) });
  }),
);

router.patch(
  '/:id',
  validate(updateUserSchema),
  asyncHandler(async (req: Request, res) => {
    const { id } = req.params;
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw NotFound('Usuário não encontrado');

    const data: Record<string, unknown> = {};
    if (req.body.name !== undefined) data.name = req.body.name;
    if (req.body.role !== undefined) data.role = req.body.role;
    if (req.body.active !== undefined) data.active = req.body.active;
    if (req.body.password) {
      data.passwordHash = await argon2.hash(req.body.password, { type: argon2.argon2id });
      data.refreshTokenHash = null;
    }

    const updated = await prisma.user.update({ where: { id }, data });
    await audit(req, 'user.update', 'User', id, { fields: Object.keys(data) });
    res.json({ success: true, data: serialize(updated) });
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req: Request, res) => {
    const { id } = req.params;
    if (id === req.user!.sub) throw Conflict('Você não pode desativar a si mesmo');

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw NotFound('Usuário não encontrado');

    await prisma.user.update({
      where: { id },
      data: { active: false, refreshTokenHash: null },
    });
    await audit(req, 'user.deactivate', 'User', id);
    res.json({ success: true });
  }),
);

export default router;
