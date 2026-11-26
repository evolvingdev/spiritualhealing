'use client';

import { useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { FormField } from '@/components/forms/form-field';
import { FormError } from '@/components/forms/form-message';
import { SubmitButton } from '@/components/forms/submit-button';
import { Alert } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { IDLE, type ActionState } from '@/lib/forms/action-state';
import { requestPasswordReset } from '../actions/password-reset';

export function ForgotPasswordForm() {
  const t = useTranslations();
  const [state, action] = useActionState<ActionState<'sent'>, FormData>(requestPasswordReset, IDLE);
  if (state.status === 'success') {
    return <Alert tone="success">{t('ForgotPassword.sent')}</Alert>;
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
      <SubmitButton width="full">{t('ForgotPassword.submit')}</SubmitButton>
    </form>
  );
}
