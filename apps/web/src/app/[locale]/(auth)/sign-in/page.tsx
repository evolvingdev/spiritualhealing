import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { AuthShell } from '@/components/brand/auth-shell';
import { Alert } from '@/components/ui/alert';
import { getServerEnv } from '@/config/server-env';
import { GoogleSignInButton } from '@/features/auth/components/google-sign-in-button';
import { SignInForm } from '@/features/auth/components/sign-in-form';
import { signInLinkError, signInReasonMessage } from '@/features/auth/sign-in-notices';
import { Link } from '@/i18n/navigation';
import { toSafeInternalPath } from '@/lib/security/safe-redirect';
import { firstValue, type SearchParams } from '@/lib/search-params';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('SignIn');
  return { title: t('title') };
}

export default async function SignInPage({
  searchParams,
}: {
  readonly searchParams: SearchParams;
}) {
  const query = await searchParams;
  const next = toSafeInternalPath(firstValue(query.next));
  const reason = signInReasonMessage(firstValue(query.reason));
  const linkError = signInLinkError(firstValue(query.error));
  const t = await getTranslations();
  return (
    <AuthShell title={t('SignIn.title')} description={t('SignIn.description')}>
      <div className="space-y-5">
        {reason === null ? null : <Alert tone="info">{t(`SignIn.${reason}`)}</Alert>}
        {linkError === null ? null : <Alert tone="error">{t(`Errors.${linkError}`)}</Alert>}
        <SignInForm next={next} />
        <p className="text-center">
          <Link
            href={{ pathname: '/sign-in/code', query: { next } }}
            className="inline-flex min-h-touch items-center text-link underline underline-offset-4 hover:no-underline"
          >
            {t('SignIn.emailCodeInstead')}
          </Link>
        </p>
        {getServerEnv().isGoogleSignInEnabled ? (
          <>
            <p className="text-center text-sm text-muted-foreground">{t('Common.or')}</p>
            <GoogleSignInButton next={next} />
          </>
        ) : null}
        <p className="text-center text-sm text-muted-foreground">
          {t('SignIn.noAccount')}{' '}
          <Link
            href="/sign-up"
            className="text-link underline underline-offset-4 hover:no-underline"
          >
            {t('SignIn.createAccount')}
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
