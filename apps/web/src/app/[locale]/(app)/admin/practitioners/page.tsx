import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Card } from '@/components/ui/card';
import { requireAccount } from '@/features/account/require-account';
import { PractitionerAccess } from '@/features/admin/components/practitioner-access';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Admin');
  return { title: t('title') };
}

/** Admins only. Hiding the page is a courtesy; the API refuses everyone else regardless. */
export default async function PractitionerAccessPage() {
  const me = await requireAccount({ returnTo: '/admin/practitioners' });
  if (!me.roles.includes('admin')) {
    notFound();
  }
  const t = await getTranslations('Admin');
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <p className="mt-2 text-muted-foreground">{t('description')}</p>
      </div>
      <Card>
        <PractitionerAccess />
      </Card>
    </div>
  );
}
