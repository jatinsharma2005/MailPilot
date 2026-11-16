import { Router } from 'express';
import { AIController } from '../controllers/ai.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { AskAISchema, GenerateReplySchema } from '../validators/ai.schema.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

// Public status endpoint reporting live engine health without leaking credentials
router.get('/status', asyncHandler(AIController.getAIStatus));
router.post('/health-check', asyncHandler(AIController.manualHealthCheck));

// Protected AI operations requiring authentication and workspace isolation
router.use(authenticate);

router.post('/classify/:emailId', asyncHandler(AIController.classifyEmail));
router.post('/summarize/:conversationId', asyncHandler(AIController.summarizeConversation));
router.post('/generate-reply/:conversationId', validate(GenerateReplySchema), asyncHandler(AIController.generateReply));
router.post('/ask', validate(AskAISchema), asyncHandler(AIController.askAssistant));

export default router;
