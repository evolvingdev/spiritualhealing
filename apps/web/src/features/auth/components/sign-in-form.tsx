'use client';

import { useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { FormField } from '@/components/forms/form-field';
import { FormError } from '@/components/forms/form-message';
import { PasswordInput } from '@/components/forms/password-input';
import { SubmitButton } from '@/components/forms/submit-button';
import { Input } from '@/components/ui/input';
import { Link } from '@/i18n/navigation';
import { IDLE, type ActionState } from '@/lib/forms/action-state';
import { signInWithPassword } from '../actions/sign-in';

export function SignInForm({ next }: { readonly next: string }) {
  const t = useTranslations();
  const [state, action] = useActionState<ActionState, FormData>(signInWithPassword, IDLE);
  const fieldErrors = state.status === 'error' ? state.fieldErrors : {};
  const values = state.status === 'error' ? state.values : {};
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormError state={state} />
      <input type="hidden" name="next" value={next} />
      <FormField label={t('Fields.email')} error={fieldErrors.email}>
        <Input
          name="email"
          type="email"
          autoComplete="username"
          required
          defaultValue={values.email}
        />
      </FormField>
      <FormField
        label={t('Fields.password')}
        error={fieldErrors.password}
        trailing={
          <Link
            href="/forgot-password"
            className="text-sm text-link underline underline-offset-4 hover:no-underline"
          >
            {t('SignIn.forgotPassword')}
          </Link>
        }
      >
        <PasswordInput name="password" autoComplete="current-password" required />
      </FormField>
      <SubmitButton width="full">{t('SignIn.submit')}</SubmitButton>
    </form>
  );
}
