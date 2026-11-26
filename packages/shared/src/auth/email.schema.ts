import { z } from 'zod';

/** RFC 5321 limit on a forward path. */
export const EMAIL_MAX_LENGTH = 254;

/** Normalised the way Supabase Auth stores addresses, so comparisons and rate-limit keys agree. */
export const emailSchema = z.string().trim().toLowerCase().pipe(z.email().max(EMAIL_MAX_LENGTH));
