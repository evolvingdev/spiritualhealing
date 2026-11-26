'use client';

import type { RoleDto } from '@spiritualhealing/shared';
import { useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { FormField } from '@/components/forms/form-field';
import { FormError } from '@/components/forms/form-message';
import { SubmitButton } from '@/components/forms/submit-button';
import { Alert } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { IDLE } from '@/lib/forms/action-state';
import { changePractitionerRole, lookUpUser, type AdminUserState } from '../actions';

/** Look up a member, then grant or remove the practitioner role. The API audits both steps. */
export function PractitionerAccess() {
  const t = useTranslations();
  const [lookup, lookUp] = useActionState<AdminUserState, FormData>(lookUpUser, IDLE);
  const [change, applyChange] = useActionState<AdminUserState, FormData>(
    changePractitionerRole,
    IDLE,
  );
  // A role change returns the account's updated roles; it applies only to the account looked up.
  const isChangeForLookedUpUser =
    change.user !== undefined && change.user.userId === lookup.user?.userId;
  const user = isChangeForLookedUpUser ? change.user : lookup.user;
  const roleName = (role: RoleDto): string => t(`Account.role_${role}`);
  return (
    <div className="space-y-6">
      <form action={lookUp} className="space-y-4" noValidate>
        {lookup.status === 'error' && lookup.error === 'not_found' ? (
          <Alert tone="info">{t('Admin.notFound')}</Alert>
        ) : (
          <FormError state={lookup} />
        )}
        <FormField
          label={t('Fields.email')}
          error={lookup.status === 'error' ? lookup.fieldErrors.email : undefined}
        >
          <Input
            name="email"
            type="email"
            autoComplete="off"
            required
            defaultValue={lookup.status === 'idle' ? undefined : lookup.values?.email}
          />
        </FormField>
        <SubmitButton>{t('Admin.lookupSubmit')}</SubmitButton>
      </form>

      {user === undefined ? null : (
        <section
          aria-labelledby="admin-result"
          className="space-y-4 rounded-control border border-border p-4"
        >
          <h2 id="admin-result" className="text-lg font-semibold">
            {t('Admin.result')}
          </h2>
          <p>
            {t('Admin.currentRoles', {
              roles:
                user.roles.length === 0 ? t('Admin.noRoles') : user.roles.map(roleName).join(', '),
            })}
          </p>
          {isChangeForLookedUpUser && change.status === 'success' && change.message !== 'found' ? (
            <Alert tone="success">
              {t(change.message === 'granted' ? 'Admin.granted' : 'Admin.revoked')}
            </Alert>
          ) : null}
          {change.status === 'error' && (change.user === undefined || isChangeForLookedUpUser) ? (
            <FormError state={change} />
          ) : null}
          <form action={applyChange}>
            <input type="hidden" name="userId" value={user.userId} />
            {user.roles.includes('practitioner') ? (
              <>
                <input type="hidden" name="change" value="revoke" />
                <SubmitButton variant="danger">{t('Admin.revoke')}</SubmitButton>
              </>
            ) : (
              <>
                <input type="hidden" name="change" value="grant" />
                <SubmitButton>{t('Admin.grant')}</SubmitButton>
              </>
            )}
          </form>
        </section>
      )}
    </div>
  );
}
