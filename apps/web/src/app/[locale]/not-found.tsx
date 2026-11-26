import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Link } from '@/i18n/navigation';

export default async function NotFoundPage() {
  const t = await getTranslations('NotFound');
  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-md items-center px-4">
      <Card className="w-full space-y-4 text-center">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground">{t('description')}</p>
        <Button asChild>
          <Link href="/">{t('home')}</Link>
        </Button>
      </Card>
    </main>
  );
}
