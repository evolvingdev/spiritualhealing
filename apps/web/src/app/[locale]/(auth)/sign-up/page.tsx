import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { AuthShell } from '@/components/brand/auth-shell';
import { SignUpForm } from '@/features/auth/components/sign-up-form';
import { Link } from '@/i18n/navigation';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('SignUp');
  return { title: t('title') };
}

export default async function SignUpPage() {
  const t = await getTranslations('SignUp');
  return (
    <AuthShell title={t('title')} description={t('description')}>
      <SignUpForm />
      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t('haveAccount')}{' '}
        <Link href="/sign-in" className="text-link underline underline-offset-4 hover:no-underline">
          {t('signIn')}
        </Link>
      </p>
    </AuthShell>
  );
}
