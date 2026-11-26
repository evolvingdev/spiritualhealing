import { z } from 'zod';

export const roleSchema = z.enum(['client', 'practitioner', 'admin']);

export type RoleDto = z.infer<typeof roleSchema>;
