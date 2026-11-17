import { Router } from 'express';
import { AIController } from '../controllers/ai.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { aiLimiter } from '../middleware/rateLimit.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { AskAISchema, GenerateReplySchema } from '../validators/ai.schema.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get('/status', authenticate, requireRole('ASSISTANT', 'ADMIN'), aiLimiter, asyncHandler(AIController.getAIStatus));
router.post('/health-check', authenticate, requireRole('ADMIN'), aiLimiter, asyncHandler(AIController.manualHealthCheck));
router.post('/ask', authenticate, aiLimiter, validate(AskAISchema), asyncHandler(AIController.askAssistant));

router.use(authenticate, requireRole('ASSISTANT', 'ADMIN'), aiLimiter);

router.post('/classify/:emailId', asyncHandler(AIController.classifyEmail));
router.post('/summarize/:conversationId', asyncHandler(AIController.summarizeConversation));
router.post('/generate-reply/:conversationId', validate(GenerateReplySchema), asyncHandler(AIController.generateReply));

export default router;
