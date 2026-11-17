import { z } from 'zod';

const meetingDetailsSchema = z
  .object({
    title: z.string().max(200).optional(),
    date: z.string().max(120).optional(),
    time: z.string().max(120).optional(),
    participants: z.array(z.string().max(120)).max(30).optional(),
    location: z.string().max(300).optional(),
    isExtracted: z.boolean().optional(),
  })
  .optional();

const taskFields = {
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  dueDate: z.string().datetime({ offset: true }).optional(),
  assignedTo: z.enum(['ASSISTANT', 'CLIENT']).default('ASSISTANT'),
  type: z.enum(['FOLLOW_UP', 'MEETING', 'APPROVAL', 'GENERAL']).default('FOLLOW_UP'),
  conversationId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  emailId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  meetingDetails: meetingDetailsSchema,
};

export const CreateTaskSchema = z.object({
  body: z.object(taskFields),
});

export const UpdateTaskSchema = z.object({
  body: z
    .object({
      title: taskFields.title.optional(),
      description: taskFields.description,
      dueDate: taskFields.dueDate.nullable().optional(),
      status: z.enum(['TODO', 'IN_PROGRESS', 'COMPLETED']).optional(),
      assignedTo: z.enum(['ASSISTANT', 'CLIENT']).optional(),
      type: z.enum(['FOLLOW_UP', 'MEETING', 'APPROVAL', 'GENERAL']).optional(),
      meetingDetails: meetingDetailsSchema,
    })
    .refine((body) => Object.keys(body).length > 0, 'At least one task field is required'),
});
