import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { AuthShell } from '@/components/brand/auth-shell';
import { Alert } from '@/components/ui/alert';
import { listVerifiedTotpFactors } from '@/features/account/account-queries';
import { requireAccount } from '@/features/account/require-account';
import { TotpCodeForm } from '@/features/auth/components/totp-code-form';
import { TotpEnrollment } from '@/features/auth/components/totp-enrollment';
import { redirect } from '@/i18n/navigation';
import { toSafeInternalPath } from '@/lib/security/safe-redirect';
import { firstValue, type SearchParams } from '@/lib/search-params';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Mfa');
  return { title: t('title') };
}

/**
 * Completes MFA for this session (challenge) or sets up an authenticator (enrolment). Reached
 * when MFA is required but pending, or from the security page with `add=1`.
 */
export default async function MfaPage({ searchParams }: { readonly searchParams: SearchParams }) {
  const query = await searchParams;
  const next = toSafeInternalPath(firstValue(query.next));
  const isAdding = firstValue(query.add) === '1';
  const me = await requireAccount({
    returnTo: `/mfa?next=${encodeURIComponent(next)}`,
    allowMfaPending: true,
    allowPendingPolicies: true,
  });
  if (!me.isMfaPending && !isAdding) {
    redirect({ href: next, locale: await getLocale() });
  }
  const [factor] = me.isMfaPending ? await listVerifiedTotpFactors() : [];
  const t = await getTranslations('Mfa');
  return (
    <AuthShell
      title={t('title')}
      description={factor === undefined ? undefined : t('challengeDescription')}
    >
      <div className="space-y-5">
        {me.isMfaRequired && factor === undefined ? (
          <Alert tone="info">{t('requiredNotice')}</Alert>
        ) : null}
        {factor === undefined ? (
          <TotpEnrollment next={next} />
        ) : (
          <TotpCodeForm factorId={factor.id} next={next} submitLabel={t('verify')} />
        )}
      </div>
    </AuthShell>
  );
}
