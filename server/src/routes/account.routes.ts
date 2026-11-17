import { Router } from 'express';
import { AccountController } from '../controllers/account.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validate } from '../middleware/validate.middleware.js';
import { ConnectAccountSchema } from '../validators/account.schema.js';

const router = Router();

router.use(authenticate, requireRole('ASSISTANT', 'ADMIN'));

router.get('/', asyncHandler(AccountController.getAccounts));
router.post('/connect', validate(ConnectAccountSchema), asyncHandler(AccountController.connectAccount));
router.delete('/:id', asyncHandler(AccountController.disconnectAccount));
router.post('/:id/sync', asyncHandler(AccountController.syncAccount));

export default router;
