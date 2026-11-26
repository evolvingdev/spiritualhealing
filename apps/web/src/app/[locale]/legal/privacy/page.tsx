import { CURRENT_POLICY_VERSIONS } from '@spiritualhealing/shared';
import type { Metadata } from 'next';
import { getLocale } from 'next-intl/server';
import { PRIVACY_NOTICE } from '@/features/legal/content/privacy-notice';
import { LegalDocumentView } from '@/features/legal/components/legal-document-view';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return { title: PRIVACY_NOTICE[locale].title, robots: { index: true, follow: true } };
}

export default async function PrivacyNoticePage() {
  const locale = await getLocale();
  return (
    <LegalDocumentView
      document={PRIVACY_NOTICE[locale]}
      version={CURRENT_POLICY_VERSIONS.privacy_notice}
    />
  );
}
