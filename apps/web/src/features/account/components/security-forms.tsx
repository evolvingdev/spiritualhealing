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
import { changePassword, removeMfaFactor, requestEmailChange } from '../actions';
import { ReauthenticationPrompt } from './reauthentication-prompt';

const SECURITY_PATH = '/account/security';

/** Either the error/reauth prompt for a failed change, or nothing. */
function Outcome({ state }: { readonly state: ActionState }) {
  if (state.status === 'error' && state.error === 'reauthentication_required') {
    return <ReauthenticationPrompt returnTo={SECURITY_PATH} />;
  }
  return <FormError state={state} />;
}

export function ChangePasswordForm() {
  const t = useTranslations();
  const [state, action] = useActionState<ActionState<'passwordChanged'>, FormData>(
    changePassword,
    IDLE,
  );
  return (
    <form action={action} className="space-y-4" noValidate>
      <Outcome state={state} />
      {state.status === 'success' ? (
        <Alert tone="success">{t('Security.passwordChanged')}</Alert>
      ) : null}
      <FormField
        label={t('Fields.newPassword')}
        hint={t('Fields.passwordHint')}
        error={state.status === 'error' ? state.fieldErrors.password : undefined}
      >
        <PasswordInput name="password" autoComplete="new-password" required minLength={12} />
      </FormField>
      <SubmitButton>{t('Security.passwordSubmit')}</SubmitButton>
    </form>
  );
}

export function ChangeEmailForm() {
  const t = useTranslations();
  const [state, action] = useActionState<ActionState<'emailRequested'>, FormData>(
    requestEmailChange,
    IDLE,
  );
  return (
    <form action={action} className="space-y-4" noValidate>
      <Outcome state={state} />
      {state.status === 'success' ? (
        <Alert tone="success">{t('Security.emailRequested')}</Alert>
      ) : null}
      <FormField
        label={t('Fields.newEmail')}
        error={state.status === 'error' ? state.fieldErrors.email : undefined}
      >
        <Input
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={state.status === 'error' ? state.values.email : undefined}
        />
      </FormField>
      <SubmitButton>{t('Security.emailSubmit')}</SubmitButton>
    </form>
  );
}

export function RemoveFactorButton({
  factorId,
  label,
}: {
  readonly factorId: string;
  readonly label: string;
}) {
  const t = useTranslations('Security');
  const [state, action] = useActionState<ActionState<'mfaRemoved'>, FormData>(
    removeMfaFactor,
    IDLE,
  );
  return (
    <form
      action={action}
      onSubmit={(event) => {
        // A native confirm keeps the destructive step explicit without a custom dialog.
        if (!window.confirm(t('mfaRemoveConfirm'))) {
          event.preventDefault();
        }
      }}
      className="space-y-2"
    >
      <Outcome state={state} />
      <input type="hidden" name="factorId" value={factorId} />
      <SubmitButton variant="danger" aria-label={`${t('mfaRemove')}: ${label}`}>
        {t('mfaRemove')}
      </SubmitButton>
    </form>
  );
}
