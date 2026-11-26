'use client';

import { useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { FormError } from '@/components/forms/form-message';
import { SubmitButton } from '@/components/forms/submit-button';
import { Alert } from '@/components/ui/alert';
import { IDLE, type ActionState } from '@/lib/forms/action-state';
import { startTotpEnrollment } from '../actions/mfa';
import { TotpCodeForm } from './totp-code-form';

const QR_CODE_SIZE_PX = 192;

/** Two steps: create the authenticator secret, then confirm it with a code from the app. */
export function TotpEnrollment({ next }: { readonly next: string }) {
  const t = useTranslations('Mfa');
  const [state, start] = useActionState<ActionState<'enrollmentStarted'>, FormData>(
    startTotpEnrollment,
    IDLE,
  );
  const enrollment = state.status === 'success' ? state.values : undefined;
  if (enrollment?.factorId === undefined || enrollment.qrCode === undefined) {
    return (
      <form action={start} className="space-y-4">
        <FormError state={state} />
        <p className="text-muted-foreground">{t('enrollDescription')}</p>
        <SubmitButton width="full">{t('startEnrollment')}</SubmitButton>
      </form>
    );
  }
  return (
    <div className="space-y-5">
      <p>{t('scanQr')}</p>
      {/* Supabase returns the QR code as an SVG data URI; next/image cannot optimise it. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={enrollment.qrCode}
        alt={t('qrAlt')}
        width={QR_CODE_SIZE_PX}
        height={QR_CODE_SIZE_PX}
        className="mx-auto rounded-control border border-border bg-surface p-2"
      />
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">{t('manualEntry')}</p>
        <p className="text-sm font-medium">{t('secretLabel')}</p>
        <code className="block break-all rounded-control bg-muted px-3 py-2 font-mono text-sm select-all">
          {enrollment.secret}
        </code>
      </div>
      <TotpCodeForm
        factorId={enrollment.factorId}
        next={next}
        submitLabel={t('confirmEnrollment')}
      />
      <Alert tone="info">{t('backupAdvice')}</Alert>
    </div>
  );
}
