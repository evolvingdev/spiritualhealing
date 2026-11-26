import type {
  MfaFactor,
  SignOutScope,
  SupabaseAuth,
} from '../../src/infrastructure/supabase-auth/supabase-auth.js';

export type SupabaseAuthCall =
  | { readonly operation: 'updatePassword'; readonly accessToken: string }
  | {
      readonly operation: 'requestEmailChange';
      readonly accessToken: string;
      readonly email: string;
    }
  | { readonly operation: 'listMfaFactors'; readonly accessToken: string }
  | {
      readonly operation: 'deleteMfaFactor';
      readonly accessToken: string;
      readonly factorId: string;
    }
  | { readonly operation: 'signOut'; readonly accessToken: string; readonly scope: SignOutScope };

/**
 * Stands in for Supabase Auth at the external boundary (ADR 0011). Factors are kept per access
 * token, mirroring Supabase scoping every user endpoint to the caller's own token.
 */
export class FakeSupabaseAuth implements SupabaseAuth {
  readonly calls: SupabaseAuthCall[] = [];
  private readonly factorsByToken = new Map<string, MfaFactor[]>();
  private nextFailure: Error | undefined;

  setFactors(accessToken: string, factors: readonly MfaFactor[]): void {
    this.factorsByToken.set(accessToken, [...factors]);
  }

  /** The next call fails with this error, as Supabase would. */
  failNextCallWith(error: Error): void {
    this.nextFailure = error;
  }

  callsFor(accessToken: string): SupabaseAuthCall[] {
    return this.calls.filter((call) => call.accessToken === accessToken);
  }

  updatePassword(accessToken: string): Promise<void> {
    return this.record({ operation: 'updatePassword', accessToken });
  }

  requestEmailChange(accessToken: string, email: string): Promise<void> {
    return this.record({ operation: 'requestEmailChange', accessToken, email });
  }

  async listMfaFactors(accessToken: string): Promise<MfaFactor[]> {
    await this.record({ operation: 'listMfaFactors', accessToken });
    return this.factorsByToken.get(accessToken) ?? [];
  }

  async deleteMfaFactor(accessToken: string, factorId: string): Promise<void> {
    await this.record({ operation: 'deleteMfaFactor', accessToken, factorId });
    const remaining = (this.factorsByToken.get(accessToken) ?? []).filter(
      ({ id }) => id !== factorId,
    );
    this.factorsByToken.set(accessToken, remaining);
  }

  signOut(accessToken: string, scope: SignOutScope): Promise<void> {
    return this.record({ operation: 'signOut', accessToken, scope });
  }

  private record(call: SupabaseAuthCall): Promise<void> {
    this.calls.push(call);
    const failure = this.nextFailure;
    this.nextFailure = undefined;
    return failure === undefined ? Promise.resolve() : Promise.reject(failure);
  }
}
