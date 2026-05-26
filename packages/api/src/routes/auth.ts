import argon2 from 'argon2';
import crypto from 'node:crypto';
import { Router, type Request } from 'express';
import { loginSchema, refreshSchema } from '@solupaes/shared';
import { prisma } from '../lib/prisma.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../lib/jwt.js';
import { Unauthorized, BadRequest } from '../lib/errors.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import { authJWT } from '../middleware/authJWT.js';
import { loginRateLimit } from '../middleware/rateLimit.js';
import { audit } from '../middleware/auditLog.js';

const router = Router();

const hashRefreshToken = (token: string): string =>
  crypto.createHash('sha256').update(token).digest('hex');

router.post(
  '/login',
  loginRateLimit,
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body as { email: string; password: string };
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.active) throw Unauthorized('Credenciais inválidas');

    const ok = await argon2.verify(user.passwordHash, password);
    if (!ok) {
      await audit(req, 'user.login.failed', 'User', user.id);
      throw Unauthorized('Credenciais inválidas');
    }

    const accessToken = signAccessToken({ sub: user.id, email: user.email, role: user.role });
    const jti = crypto.randomUUID();
    const refreshToken = signRefreshToken({ sub: user.id, jti });

    await prisma.user.update({
      where: { id: user.id },
      data: {
        refreshTokenHash: hashRefreshToken(refreshToken),
        lastLoginAt: new Date(),
      },
    });

    await audit(req, 'user.login.success', 'User', user.id);

    res.json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          active: user.active,
          createdAt: user.createdAt.toISOString(),
          lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
        },
      },
    });
  }),
);

router.post(
  '/refresh',
  validate(refreshSchema),
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body as { refreshToken: string };

    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw Unauthorized('Refresh inválido');
    }

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.active) throw Unauthorized();
    if (!user.refreshTokenHash || user.refreshTokenHash !== hashRefreshToken(refreshToken)) {
      await audit(req, 'user.refresh.token_reuse', 'User', user.id);
      throw Unauthorized('Refresh já utilizado');
    }

    const newAccess = signAccessToken({ sub: user.id, email: user.email, role: user.role });
    const newJti = crypto.randomUUID();
    const newRefresh = signRefreshToken({ sub: user.id, jti: newJti });

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash: hashRefreshToken(newRefresh) },
    });

    res.json({
      success: true,
      data: { accessToken: newAccess, refreshToken: newRefresh },
    });
  }),
);

router.post(
  '/logout',
  authJWT,
  asyncHandler(async (req: Request, res) => {
    await prisma.user.update({
      where: { id: req.user!.sub },
      data: { refreshTokenHash: null },
    });
    await audit(req, 'user.logout', 'User', req.user!.sub);
    res.json({ success: true });
  }),
);

router.get(
  '/me',
  authJWT,
  asyncHandler(async (req: Request, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
    if (!user) throw Unauthorized();
    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        active: user.active,
        createdAt: user.createdAt.toISOString(),
        lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      },
    });
  }),
);

router.use((_req, _res, next) => next(BadRequest('Rota auth inválida')));

export default router;
