import { getLocale, getTranslations } from 'next-intl/server';
import { AuthShell } from '@/components/brand/auth-shell';
import { Button } from '@/components/ui/button';
import { Link, redirect } from '@/i18n/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server-client';

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();
  if (data !== null) {
    redirect({ href: '/account', locale: await getLocale() });
  }
  const t = await getTranslations();
  return (
    <AuthShell title={t('Home.title')} description={t('Brand.tagline')}>
      <div className="space-y-3">
        <Button asChild width="full">
          <Link href="/sign-in">{t('Home.signIn')}</Link>
        </Button>
        <Button asChild width="full" variant="secondary">
          <Link href="/sign-up">{t('Home.createAccount')}</Link>
        </Button>
      </div>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t('Common.notMedicalAdvice')}
      </p>
    </AuthShell>
  );
}
