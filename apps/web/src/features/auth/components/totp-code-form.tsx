'use client';

import { useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { FormField } from '@/components/forms/form-field';
import { FormError } from '@/components/forms/form-message';
import { OneTimeCodeInput } from '@/components/forms/one-time-code-input';
import { SubmitButton } from '@/components/forms/submit-button';
import { IDLE, type ActionState } from '@/lib/forms/action-state';
import { verifyTotp } from '../actions/mfa';

export interface TotpCodeFormProps {
  readonly factorId: string;
  readonly next: string;
  readonly submitLabel: string;
}

/** Asks for the 6-digit code from the authenticator app (sign-in challenge or enrolment check). */
export function TotpCodeForm({ factorId, next, submitLabel }: TotpCodeFormProps) {
  const t = useTranslations('Fields');
  const [state, action] = useActionState<ActionState, FormData>(verifyTotp, IDLE);
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormError state={state} />
      <input type="hidden" name="factorId" value={factorId} />
      <input type="hidden" name="next" value={next} />
      <FormField
        label={t('code')}
        error={state.status === 'error' ? state.fieldErrors.code : undefined}
      >
        <OneTimeCodeInput name="code" required />
      </FormField>
      <SubmitButton width="full">{submitLabel}</SubmitButton>
    </form>
  );
}
