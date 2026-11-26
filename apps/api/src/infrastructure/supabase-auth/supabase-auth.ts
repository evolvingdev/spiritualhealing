import type { MfaFactorStatus } from '@spiritualhealing/domain';

export interface MfaFactor {
  readonly id: string;
  readonly status: MfaFactorStatus;
}

export type SignOutScope = 'local' | 'others' | 'global';

/**
 * The Supabase Auth operations the API performs on a user's behalf. Every call is made with the
 * user's own access token, so Supabase applies its own checks (for example aal2 to remove a
 * factor) and the API never holds a service-role key. Tests replace this at the boundary.
 */
export interface SupabaseAuth {
  updatePassword(accessToken: string, password: string): Promise<void>;
  /** Starts Supabase's double-confirmed email change; nothing changes until both links are used. */
  requestEmailChange(accessToken: string, email: string): Promise<void>;
  listMfaFactors(accessToken: string): Promise<MfaFactor[]>;
  deleteMfaFactor(accessToken: string, factorId: string): Promise<void>;
  signOut(accessToken: string, scope: SignOutScope): Promise<void>;
}

export const SUPABASE_AUTH = Symbol('SUPABASE_AUTH');
