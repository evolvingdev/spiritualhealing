'use client';

import { useTranslations } from 'next-intl';
import { useActionState, useState } from 'react';
import { FormField } from '@/components/forms/form-field';
import { FormError } from '@/components/forms/form-message';
import { OneTimeCodeInput } from '@/components/forms/one-time-code-input';
import { SubmitButton } from '@/components/forms/submit-button';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { IDLE, type ActionState } from '@/lib/forms/action-state';
import { requestSignInCode, verifySignInCode } from '../actions/sign-in';

type CodeState = ActionState<'codeSent'>;

/** Two steps on one page: ask for the email, then for the code that was emailed. */
export function CodeSignInForm({ next }: { readonly next: string }) {
  const [requestState, request] = useActionState<CodeState, FormData>(requestSignInCode, IDLE);
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const sentTo = requestState.status === 'success' ? requestState.values?.email : undefined;
  if (sentTo === undefined || isChangingEmail) {
    return (
      <EmailStep
        state={requestState}
        action={(formData) => {
          setIsChangingEmail(false);
          request(formData);
        }}
        next={next}
      />
    );
  }
  return (
    <CodeStep
      email={sentTo}
      next={next}
      onChangeEmail={() => {
        setIsChangingEmail(true);
      }}
    />
  );
}

function EmailStep({
  state,
  action,
  next,
}: {
  readonly state: CodeState;
  readonly action: (formData: FormData) => void;
  readonly next: string;
}) {
  const t = useTranslations();
  const fieldErrors = state.status === 'error' ? state.fieldErrors : {};
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormError state={state} />
      <input type="hidden" name="next" value={next} />
      <FormField label={t('Fields.email')} error={fieldErrors.email}>
        <Input
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={state.status === 'error' ? state.values.email : undefined}
        />
      </FormField>
      <SubmitButton width="full">{t('SignInCode.sendCode')}</SubmitButton>
    </form>
  );
}

function CodeStep({
  email,
  next,
  onChangeEmail,
}: {
  readonly email: string;
  readonly next: string;
  readonly onChangeEmail: () => void;
}) {
  const t = useTranslations();
  const [state, verify] = useActionState<CodeState, FormData>(verifySignInCode, IDLE);
  const fieldErrors = state.status === 'error' ? state.fieldErrors : {};
  return (
    <div className="space-y-4">
      <Alert tone="info">{t('SignInCode.codeSent')}</Alert>
      <form action={verify} className="space-y-4" noValidate>
        <FormError state={state} />
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="next" value={next} />
        <FormField label={t('Fields.code')} error={fieldErrors.code}>
          <OneTimeCodeInput name="code" required />
        </FormField>
        <SubmitButton width="full">{t('SignInCode.verify')}</SubmitButton>
      </form>
      <Button variant="ghost" width="full" onClick={onChangeEmail}>
        {t('SignInCode.differentEmail')}
      </Button>
    </div>
  );
}
