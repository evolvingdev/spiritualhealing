import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { AuthShell } from '@/components/brand/auth-shell';
import { requireAccount } from '@/features/account/require-account';
import { NewPasswordForm } from '@/features/auth/components/new-password-form';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('ResetPassword');
  return { title: t('title') };
}

/**
 * Reached from the recovery link, which signed the user in. MFA comes first for accounts that
 * have it; accepting policies does not, since securing one's account must always be possible.
 */
export default async function ResetPasswordPage() {
  await requireAccount({ returnTo: '/reset-password', allowPendingPolicies: true });
  const t = await getTranslations('ResetPassword');
  return (
    <AuthShell title={t('title')} description={t('description')}>
      <NewPasswordForm />
    </AuthShell>
  );
}
