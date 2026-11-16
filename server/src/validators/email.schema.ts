import { z } from 'zod';

export const UpdateClassificationSchema = z.object({
  body: z.object({
    classification: z.enum(['ASSISTANT_TO_REPLY', 'CLIENT_TO_REPLY', 'NO_REPLY_NEEDED', 'NEEDS_REVIEW']),
    reason: z.string().optional(),
  }),
});

export const SendReplySchema = z.object({
  body: z.object({
    to: z.string().email(),
    cc: z.string().optional(),
    subject: z.string().min(1),
    body: z.string().min(1),
    tone: z.enum(['professional', 'friendly', 'concise', 'formal']).default('professional'),
    isSimulated: z.boolean().default(true),
    isApproved: z
      .boolean({
        required_error: 'Explicit human approval is required before email dispatch.',
      })
      .refine((v) => v === true, {
        message: 'Explicit human approval must be granted before email dispatch.',
      }),
  }),
});

export const DelegateEmailSchema = z.object({
  body: z.object({
    delegationReason: z.string().optional(),
  }),
});

export const HandleEmailSchema = z.object({
  body: z.object({
    clientNotes: z.string().optional(),
  }),
});
