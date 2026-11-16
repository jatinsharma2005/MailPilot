import { Router } from 'express';
import { ClientController } from '../controllers/client.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { HandleEmailSchema, DelegateEmailSchema } from '../validators/email.schema.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.use(authenticate);

router.get('/attention', asyncHandler(ClientController.getAttentionEmails));
router.get('/history', asyncHandler(ClientController.getHistory));
router.patch('/emails/:id/handle', requireRole('CLIENT', 'ADMIN'), validate(HandleEmailSchema), asyncHandler(ClientController.handleEmail));
router.patch('/emails/:id/delegate', requireRole('CLIENT', 'ADMIN'), validate(DelegateEmailSchema), asyncHandler(ClientController.delegateEmail));

export default router;
