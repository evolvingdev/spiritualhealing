import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { AuthShell } from '@/components/brand/auth-shell';
import { requireAccount } from '@/features/account/require-account';
import { OnboardingForm } from '@/features/onboarding/components/onboarding-form';
import { redirect } from '@/i18n/navigation';
import { toSafeInternalPath } from '@/lib/security/safe-redirect';
import { firstValue, type SearchParams } from '@/lib/search-params';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Onboarding');
  return { title: t('title') };
}

/** After MFA (when required) and before anything else: the 18+ attestation and the policies. */
export default async function OnboardingPage({
  searchParams,
}: {
  readonly searchParams: SearchParams;
}) {
  const next = toSafeInternalPath(firstValue((await searchParams).next));
  const me = await requireAccount({
    returnTo: `/onboarding?next=${encodeURIComponent(next)}`,
    allowPendingPolicies: true,
  });
  if (me.pendingPolicies.length === 0) {
    redirect({ href: next, locale: await getLocale() });
  }
  const t = await getTranslations('Onboarding');
  return (
    <AuthShell title={t('title')} description={t('description')}>
      <OnboardingForm next={next} />
    </AuthShell>
  );
}
