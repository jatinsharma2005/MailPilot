import { Router } from 'express';
import { AccountController } from '../controllers/account.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.use(authenticate);

router.get('/', asyncHandler(AccountController.getAccounts));
router.post('/connect', requireRole('ASSISTANT', 'ADMIN'), asyncHandler(AccountController.connectAccount));
router.delete('/:id', requireRole('ASSISTANT', 'ADMIN'), asyncHandler(AccountController.disconnectAccount));
router.post('/:id/sync', requireRole('ASSISTANT', 'ADMIN'), asyncHandler(AccountController.syncAccount));

export default router;
