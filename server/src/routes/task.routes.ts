import { Router } from 'express';
import { TaskController } from '../controllers/task.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.use(authenticate);

router.get('/', asyncHandler(TaskController.getTasks));
router.post('/', requireRole('ASSISTANT', 'ADMIN'), asyncHandler(TaskController.createTask));
router.patch('/:id', requireRole('ASSISTANT', 'ADMIN'), asyncHandler(TaskController.updateTask));
router.delete('/:id', requireRole('ASSISTANT', 'ADMIN'), asyncHandler(TaskController.deleteTask));

export default router;
