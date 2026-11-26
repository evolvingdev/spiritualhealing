'use client';

import { useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { FormError } from '@/components/forms/form-message';
import { SubmitButton } from '@/components/forms/submit-button';
import { IDLE, type ActionState } from '@/lib/forms/action-state';
import { signInWithGoogle } from '../actions/sign-in';

export function GoogleSignInButton({ next }: { readonly next: string }) {
  const t = useTranslations('SignIn');
  const [state, action] = useActionState<ActionState, FormData>(signInWithGoogle, IDLE);
  return (
    <form action={action} className="space-y-3">
      <FormError state={state} />
      <input type="hidden" name="next" value={next} />
      <SubmitButton width="full" variant="secondary">
        {t('google')}
      </SubmitButton>
    </form>
  );
}
