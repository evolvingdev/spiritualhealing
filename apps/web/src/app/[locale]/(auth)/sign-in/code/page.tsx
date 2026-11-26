import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { AuthShell } from '@/components/brand/auth-shell';
import { CodeSignInForm } from '@/features/auth/components/code-sign-in-form';
import { Link } from '@/i18n/navigation';
import { toSafeInternalPath } from '@/lib/security/safe-redirect';
import { firstValue, type SearchParams } from '@/lib/search-params';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('SignInCode');
  return { title: t('title') };
}

export default async function CodeSignInPage({
  searchParams,
}: {
  readonly searchParams: SearchParams;
}) {
  const next = toSafeInternalPath(firstValue((await searchParams).next));
  const t = await getTranslations('SignInCode');
  return (
    <AuthShell title={t('title')} description={t('description')}>
      <CodeSignInForm next={next} />
      <p className="mt-4 text-center">
        <Link
          href={{ pathname: '/sign-in', query: { next } }}
          className="inline-flex min-h-touch items-center text-link underline underline-offset-4 hover:no-underline"
        >
          {t('usePassword')}
        </Link>
      </p>
    </AuthShell>
  );
}
