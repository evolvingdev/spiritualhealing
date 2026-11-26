'use client';

import { useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { FormField } from '@/components/forms/form-field';
import { FormError } from '@/components/forms/form-message';
import { PasswordInput } from '@/components/forms/password-input';
import { SubmitButton } from '@/components/forms/submit-button';
import { Alert } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { IDLE, type ActionState } from '@/lib/forms/action-state';
import { signUp } from '../actions/sign-up';

export function SignUpForm() {
  const t = useTranslations();
  const [state, action] = useActionState<ActionState<'checkInbox'>, FormData>(signUp, IDLE);
  if (state.status === 'success') {
    return <Alert tone="success">{t('SignUp.checkInbox')}</Alert>;
  }
  const fieldErrors = state.status === 'error' ? state.fieldErrors : {};
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormError state={state} />
      <FormField label={t('Fields.email')} error={fieldErrors.email}>
        <Input
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={state.status === 'error' ? state.values.email : undefined}
        />
      </FormField>
      <FormField
        label={t('Fields.password')}
        hint={t('Fields.passwordHint')}
        error={fieldErrors.password}
      >
        <PasswordInput name="password" autoComplete="new-password" required minLength={12} />
      </FormField>
      <SubmitButton width="full">{t('SignUp.submit')}</SubmitButton>
    </form>
  );
}
