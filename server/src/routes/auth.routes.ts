import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { validate } from '../middleware/validate.middleware.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { authLimiter } from '../middleware/rateLimit.middleware.js';
import {
  RegisterSchema,
  LoginSchema,
  DemoLoginSchema,
  UpdateProfileSchema,
} from '../validators/auth.schema.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.post('/register', authLimiter, validate(RegisterSchema), asyncHandler(AuthController.register));
router.post('/login', authLimiter, validate(LoginSchema), asyncHandler(AuthController.login));
router.post('/demo-login', authLimiter, validate(DemoLoginSchema), asyncHandler(AuthController.demoLogin));
router.get('/me', authenticate, asyncHandler(AuthController.getMe));
router.patch(
  '/profile',
  authenticate,
  requireRole('ASSISTANT', 'ADMIN'),
  validate(UpdateProfileSchema),
  asyncHandler(AuthController.updateProfile)
);
router.post('/logout', authenticate, asyncHandler(AuthController.logout));

export default router;
