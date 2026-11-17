import { z } from 'zod';

export const AIClassificationResultSchema = z.object({
  classification: z.enum(['ASSISTANT_TO_REPLY', 'CLIENT_TO_REPLY', 'NO_REPLY_NEEDED', 'NEEDS_REVIEW']),
  confidence: z.number().min(0).max(1),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  requiresAction: z.boolean(),
  summary: z.string().min(5),
  reason: z.string().min(5),
  suggestedAction: z.string(),
  suggestedCategory: z.string().optional().default('General'),
  keyPoints: z.array(z.string()).default([]),
  extractedDates: z.array(z.string()).default([]),
  suggestedReply: z.string().nullable().optional(),
});

export type AIClassificationResult = z.infer<typeof AIClassificationResultSchema>;

export const AskAISchema = z.object({
  body: z.object({
    query: z.string().min(2, 'Query must be at least 2 characters').max(1000),
    conversationId: z.string().optional(),
  }),
});

export const GenerateReplySchema = z.object({
  body: z.object({
    tone: z.enum(['professional', 'friendly', 'concise', 'formal']).default('professional'),
    customInstructions: z.string().max(2000).optional(),
  }),
});
