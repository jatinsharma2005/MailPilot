import { z } from 'zod';

export const RegisterSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    role: z.enum(['ADMIN', 'ASSISTANT', 'CLIENT']).default('ASSISTANT'),
    workspaceName: z.string().optional(),
  }),
});

export const LoginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
  }),
});

export const DemoLoginSchema = z.object({
  body: z.object({
    role: z.enum(['ASSISTANT', 'CLIENT', 'ADMIN']),
  }),
});
