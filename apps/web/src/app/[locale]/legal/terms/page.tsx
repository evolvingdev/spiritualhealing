import { CURRENT_POLICY_VERSIONS } from '@spiritualhealing/shared';
import type { Metadata } from 'next';
import { getLocale } from 'next-intl/server';
import { TERMS_OF_SERVICE } from '@/features/legal/content/terms-of-service';
import { LegalDocumentView } from '@/features/legal/components/legal-document-view';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return { title: TERMS_OF_SERVICE[locale].title, robots: { index: true, follow: true } };
}

export default async function TermsOfServicePage() {
  const locale = await getLocale();
  return (
    <LegalDocumentView
      document={TERMS_OF_SERVICE[locale]}
      version={CURRENT_POLICY_VERSIONS.terms_of_service}
    />
  );
}
