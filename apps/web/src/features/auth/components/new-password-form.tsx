'use client';

import { useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { FormField } from '@/components/forms/form-field';
import { FormError } from '@/components/forms/form-message';
import { PasswordInput } from '@/components/forms/password-input';
import { SubmitButton } from '@/components/forms/submit-button';
import { IDLE, type ActionState } from '@/lib/forms/action-state';
import { completePasswordReset } from '../actions/password-reset';

export function NewPasswordForm() {
  const t = useTranslations();
  const [state, action] = useActionState<ActionState, FormData>(completePasswordReset, IDLE);
  const fieldErrors = state.status === 'error' ? state.fieldErrors : {};
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormError state={state} />
      <FormField
        label={t('Fields.newPassword')}
        hint={t('Fields.passwordHint')}
        error={fieldErrors.password}
      >
        <PasswordInput name="password" autoComplete="new-password" required minLength={12} />
      </FormField>
      <SubmitButton width="full">{t('ResetPassword.submit')}</SubmitButton>
    </form>
  );
}
