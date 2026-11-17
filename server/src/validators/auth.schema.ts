import { z } from 'zod';

export const RegisterSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100),
    email: z.string().email('Invalid email address').max(254),
    password: z.string().min(8, 'Password must be at least 8 characters').max(128),
    role: z.enum(['ASSISTANT', 'CLIENT']).default('ASSISTANT'),
    workspaceName: z.string().min(1).max(120).optional(),
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
    role: z.enum(['ASSISTANT', 'CLIENT']),
  }),
});

export const UpdateProfileSchema = z.object({
  body: z
    .object({
      name: z.string().min(2).max(100).optional(),
      workspaceName: z.string().min(1).max(120).optional(),
      avatar: z.string().url().max(512).optional(),
    })
    .refine((body) => Object.keys(body).length > 0, 'At least one profile field is required'),
});
