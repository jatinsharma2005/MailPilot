import { Router } from 'express';
import { TaskController } from '../controllers/task.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validate } from '../middleware/validate.middleware.js';
import { CreateTaskSchema, UpdateTaskSchema } from '../validators/task.schema.js';

const router = Router();

router.use(authenticate, requireRole('ASSISTANT', 'ADMIN'));

router.get('/', asyncHandler(TaskController.getTasks));
router.post('/', validate(CreateTaskSchema), asyncHandler(TaskController.createTask));
router.patch('/:id', validate(UpdateTaskSchema), asyncHandler(TaskController.updateTask));
router.delete('/:id', asyncHandler(TaskController.deleteTask));

export default router;
