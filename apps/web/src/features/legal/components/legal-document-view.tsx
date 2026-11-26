import { getTranslations } from 'next-intl/server';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { Alert } from '@/components/ui/alert';
import { Link } from '@/i18n/navigation';
import type { LegalDocument } from '../legal-document';

export interface LegalDocumentViewProps {
  readonly document: LegalDocument;
  readonly version: string;
}

export async function LegalDocumentView({ document, version }: LegalDocumentViewProps) {
  const t = await getTranslations();
  return (
    <div className="min-h-dvh bg-background">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
        <Link href="/" className="flex min-h-touch items-center text-lg font-semibold">
          {t('Brand.name')}
        </Link>
        <LocaleSwitcher />
      </header>
      <main id="main" className="mx-auto max-w-3xl px-4 pb-16">
        <article className="space-y-6">
          <header>
            <h1 className="text-3xl font-bold">{document.title}</h1>
            <p className="mt-2 text-muted-foreground">{t('Legal.version', { version })}</p>
          </header>
          <Alert tone="info">{t('Legal.draftNotice')}</Alert>
          {document.sections.map((section) => (
            <section key={section.heading} className="space-y-3">
              <h2 className="text-xl font-semibold">{section.heading}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph} className="leading-7">
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </article>
      </main>
    </div>
  );
}
