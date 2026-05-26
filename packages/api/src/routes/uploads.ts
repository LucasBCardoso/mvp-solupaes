import { Router, type Request } from 'express';
import { uploadFacadeSchema } from '@solupaes/shared';
import { asyncHandler } from '../lib/asyncHandler.js';
import { authJWT } from '../middleware/authJWT.js';
import { requireAuth } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { facadeKey, presignFacadeUpload } from '../services/storageR2.js';
import { audit } from '../middleware/auditLog.js';
import { isStorageConfigured } from '../lib/env.js';
import { BadRequest } from '../lib/errors.js';

const router = Router();
router.use(authJWT, requireAuth);

router.post(
  '/facade',
  validate(uploadFacadeSchema),
  asyncHandler(async (req: Request, res) => {
    if (!isStorageConfigured) {
      throw BadRequest('Storage não configurado no servidor. Defina R2_* no .env');
    }
    const { contentType, clientUuid } = req.body;
    const ext = contentType.split('/')[1].replace('jpeg', 'jpg');
    const key = facadeKey(clientUuid, ext);
    const url = await presignFacadeUpload({ key, contentType, expiresInSeconds: 300 });
    await audit(req, 'upload.presign', 'FacadePhoto', key);
    res.json({ success: true, data: { uploadUrl: url, key, expiresIn: 300 } });
  }),
);

export default router;
