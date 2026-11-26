import { useTranslations } from 'next-intl';
import { SubmitButton } from '@/components/forms/submit-button';
import { Alert } from '@/components/ui/alert';
import { signInAgain } from '@/features/auth/actions/sign-out';

/** Shown when the API asks for a fresh sign-in before a sensitive change (5-minute rule). */
export function ReauthenticationPrompt({ returnTo }: { readonly returnTo: string }) {
  const t = useTranslations('Security');
  return (
    <Alert tone="info">
      <p className="font-medium">{t('reauthTitle')}</p>
      <p className="mt-1">{t('reauthDescription')}</p>
      <form action={signInAgain} className="mt-3">
        <input type="hidden" name="next" value={returnTo} />
        <SubmitButton variant="secondary">{t('reauthButton')}</SubmitButton>
      </form>
    </Alert>
  );
}
