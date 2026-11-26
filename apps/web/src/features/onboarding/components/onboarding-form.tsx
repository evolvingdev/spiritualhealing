'use client';

import { useTranslations } from 'next-intl';
import { useActionState, useId, type ReactNode } from 'react';
import { FormError } from '@/components/forms/form-message';
import { SubmitButton } from '@/components/forms/submit-button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Link } from '@/i18n/navigation';
import { IDLE, type ActionState, type FieldErrorKey } from '@/lib/forms/action-state';
import { completeOnboarding } from '../actions';

function ConsentCheckbox({
  name,
  children,
  error,
}: {
  readonly name: string;
  readonly children: ReactNode;
  readonly error: FieldErrorKey | undefined;
}) {
  const t = useTranslations('FieldErrors');
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div>
      <div className="flex min-h-touch items-start gap-3">
        <Checkbox
          id={id}
          name={name}
          required
          aria-invalid={error === undefined ? undefined : true}
          aria-describedby={error === undefined ? undefined : errorId}
        />
        <Label htmlFor={id} className="font-normal leading-6">
          {children}
        </Label>
      </div>
      {error === undefined ? null : (
        <p id={errorId} className="ms-9 text-sm font-medium text-danger">
          {t(error)}
        </p>
      )}
    </div>
  );
}

/** Each consent is a separate, unticked checkbox (ADR 0016: itemised, explicit consent). */
export function OnboardingForm({ next }: { readonly next: string }) {
  const t = useTranslations('Onboarding');
  const [state, action] = useActionState<ActionState, FormData>(completeOnboarding, IDLE);
  const fieldErrors = state.status === 'error' ? state.fieldErrors : {};
  const documentLink = (href: '/legal/terms' | '/legal/privacy') =>
    function DocumentLink(chunks: ReactNode) {
      return (
        <Link href={href} target="_blank" className="text-link underline">
          {chunks}
        </Link>
      );
    };
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormError state={state} />
      <input type="hidden" name="next" value={next} />
      <ConsentCheckbox name="adult_attestation" error={fieldErrors.adult_attestation}>
        {t('adultAttestation')}
      </ConsentCheckbox>
      <ConsentCheckbox name="terms_of_service" error={fieldErrors.terms_of_service}>
        {t.rich('acceptTerms', { terms: documentLink('/legal/terms') })}
      </ConsentCheckbox>
      <ConsentCheckbox name="privacy_notice" error={fieldErrors.privacy_notice}>
        {t.rich('acceptPrivacy', { privacy: documentLink('/legal/privacy') })}
      </ConsentCheckbox>
      <SubmitButton width="full">{t('submit')}</SubmitButton>
    </form>
  );
}
