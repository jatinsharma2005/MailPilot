import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.use(authenticate);

router.get('/stats', asyncHandler(DashboardController.getStats));
router.get('/recent', asyncHandler(DashboardController.getRecent));

export default router;
