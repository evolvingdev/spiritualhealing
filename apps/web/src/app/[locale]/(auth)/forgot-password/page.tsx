import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { AuthShell } from '@/components/brand/auth-shell';
import { ForgotPasswordForm } from '@/features/auth/components/forgot-password-form';
import { Link } from '@/i18n/navigation';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('ForgotPassword');
  return { title: t('title') };
}

export default async function ForgotPasswordPage() {
  const t = await getTranslations();
  return (
    <AuthShell title={t('ForgotPassword.title')} description={t('ForgotPassword.description')}>
      <ForgotPasswordForm />
      <p className="mt-6 text-center">
        <Link
          href="/sign-in"
          className="inline-flex min-h-touch items-center text-link underline underline-offset-4 hover:no-underline"
        >
          {t('Common.backToSignIn')}
        </Link>
      </p>
    </AuthShell>
  );
}
