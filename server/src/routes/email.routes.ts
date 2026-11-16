import { Router } from 'express';
import { EmailController } from '../controllers/email.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { UpdateClassificationSchema, SendReplySchema } from '../validators/email.schema.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.use(authenticate);

router.get('/', asyncHandler(EmailController.getEmails));
router.get('/:id', asyncHandler(EmailController.getEmailById));
router.patch(
  '/:id/classification',
  requireRole('ASSISTANT', 'ADMIN'),
  validate(UpdateClassificationSchema),
  asyncHandler(EmailController.updateClassification)
);
router.patch('/:id/read', asyncHandler(EmailController.toggleRead));
router.patch('/:id/important', asyncHandler(EmailController.toggleImportant));
router.patch('/:id/archive', requireRole('ASSISTANT', 'ADMIN'), asyncHandler(EmailController.toggleArchive));
router.patch('/:id/complete', requireRole('ASSISTANT', 'ADMIN'), asyncHandler(EmailController.markComplete));
router.post(
  '/:id/reply',
  requireRole('ASSISTANT', 'ADMIN'),
  validate(SendReplySchema),
  asyncHandler(EmailController.sendReply)
);

export default router;
