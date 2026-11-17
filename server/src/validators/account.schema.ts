import { z } from 'zod';

export const ConnectAccountSchema = z.object({
  body: z.object({
    provider: z.enum(['gmail', 'outlook']),
    emailAddress: z.string().email().max(254),
    displayName: z.string().max(120).optional(),
  }),
});
