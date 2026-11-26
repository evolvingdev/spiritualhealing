import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import { getFormatter, getTranslations } from 'next-intl/server';
import { SubmitButton } from '@/components/forms/submit-button';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { listVerifiedTotpFactors } from '@/features/account/account-queries';
import {
  ChangeEmailForm,
  ChangePasswordForm,
  RemoveFactorButton,
} from '@/features/account/components/security-forms';
import { requireAccount } from '@/features/account/require-account';
import { signOutEverywhere } from '@/features/auth/actions/sign-out';
import { Link } from '@/i18n/navigation';
import { firstValue, type SearchParams } from '@/lib/search-params';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Security');
  return { title: t('title') };
}

export default async function SecurityPage({
  searchParams,
}: {
  readonly searchParams: SearchParams;
}) {
  await requireAccount({ returnTo: '/account/security' });
  const isEmailConfirmed = firstValue((await searchParams).notice) === 'emailConfirmed';
  const factors = await listVerifiedTotpFactors();
  const t = await getTranslations('Security');
  const format = await getFormatter();
  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/account"
          className="inline-flex min-h-touch items-center gap-2 text-link underline underline-offset-4 hover:no-underline"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          {t('back')}
        </Link>
        <h1 className="mt-2 text-3xl font-bold">{t('title')}</h1>
        <p className="mt-2 text-muted-foreground">{t('reauthDescription')}</p>
      </div>
      {isEmailConfirmed ? <Alert tone="success">{t('emailConfirmed')}</Alert> : null}

      <Card aria-labelledby="password-title">
        <CardTitle id="password-title">{t('passwordTitle')}</CardTitle>
        <div className="mt-4">
          <ChangePasswordForm />
        </div>
      </Card>

      <Card aria-labelledby="email-title">
        <CardTitle id="email-title">{t('emailTitle')}</CardTitle>
        <CardDescription>{t('emailDescription')}</CardDescription>
        <div className="mt-4">
          <ChangeEmailForm />
        </div>
      </Card>

      <Card aria-labelledby="mfa-title">
        <CardTitle id="mfa-title">{t('mfaTitle')}</CardTitle>
        {factors.length === 0 ? <CardDescription>{t('mfaNone')}</CardDescription> : null}
        <ul className="mt-4 space-y-3">
          {factors.map((factor) => {
            const label = t('mfaFactor', {
              date: format.dateTime(new Date(factor.created_at), { dateStyle: 'medium' }),
            });
            return (
              <li
                key={factor.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-control border border-border p-3"
              >
                <span>{label}</span>
                <RemoveFactorButton factorId={factor.id} label={label} />
              </li>
            );
          })}
        </ul>
        <Button asChild variant="secondary" className="mt-4">
          <Link href={{ pathname: '/mfa', query: { add: '1', next: '/account/security' } }}>
            {t('mfaAdd')}
          </Link>
        </Button>
      </Card>

      <Card aria-labelledby="sessions-title">
        <CardTitle id="sessions-title">{t('sessionsTitle')}</CardTitle>
        <CardDescription>{t('sessionsDescription')}</CardDescription>
        <form action={signOutEverywhere} className="mt-4">
          <SubmitButton variant="danger">{t('sessionsSubmit')}</SubmitButton>
        </form>
      </Card>
    </div>
  );
}
