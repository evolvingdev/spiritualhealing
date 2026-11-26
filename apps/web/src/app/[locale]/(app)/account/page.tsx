import { ChevronRight } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { getSignedInEmail } from '@/features/account/account-queries';
import { requireAccount } from '@/features/account/require-account';
import { Link } from '@/i18n/navigation';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Account');
  return { title: t('title') };
}

export default async function AccountPage() {
  const me = await requireAccount({ returnTo: '/account' });
  const email = await getSignedInEmail();
  const t = await getTranslations('Account');
  const links = [
    { href: '/account/security', title: t('security'), description: t('securityDescription') },
    ...(me.roles.includes('admin')
      ? [{ href: '/admin/practitioners', title: t('admin'), description: t('adminDescription') }]
      : []),
  ] as const;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        {email === null ? null : (
          <p className="mt-2 text-muted-foreground">{t('signedInAs', { email })}</p>
        )}
      </div>
      <Card>
        <CardTitle>{t('roles')}</CardTitle>
        <ul className="mt-3 flex flex-wrap gap-2">
          {me.roles.map((role) => (
            <li key={role} className="rounded-full bg-muted px-3 py-1 text-sm font-medium">
              {t(`role_${role}`)}
            </li>
          ))}
        </ul>
        <CardDescription className="mt-4">{t('comingSoon')}</CardDescription>
      </Card>
      <nav className="grid gap-4 sm:grid-cols-2">
        {links.map(({ href, title, description }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center justify-between gap-4 rounded-card bg-surface p-6 shadow-card hover:bg-muted"
          >
            <span>
              <span className="block text-lg font-semibold">{title}</span>
              <span className="mt-1 block text-muted-foreground">{description}</span>
            </span>
            <ChevronRight aria-hidden="true" className="size-5 shrink-0" />
          </Link>
        ))}
      </nav>
    </div>
  );
}
