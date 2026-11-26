'use client';

import { Eye, EyeOff } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, type ComponentProps } from 'react';
import { Input } from '@/components/ui/input';

type PasswordInputProps = Omit<ComponentProps<'input'>, 'type'> & {
  readonly autoComplete: 'current-password' | 'new-password';
};

/** A password field with a show/hide toggle, which helps more than a "confirm password" field. */
export function PasswordInput(props: PasswordInputProps) {
  const t = useTranslations('Common');
  const [isVisible, setIsVisible] = useState(false);
  return (
    <div className="relative">
      <Input
        {...props}
        type={isVisible ? 'text' : 'password'}
        className="pe-12"
        spellCheck={false}
        autoCapitalize="none"
      />
      <button
        type="button"
        onClick={() => {
          setIsVisible((visible) => !visible);
        }}
        aria-label={isVisible ? t('hidePassword') : t('showPassword')}
        aria-pressed={isVisible}
        className="absolute inset-y-0 end-0 flex w-touch items-center justify-center rounded-e-control text-muted-foreground hover:text-foreground"
      >
        {isVisible ? (
          <EyeOff aria-hidden="true" className="size-5" />
        ) : (
          <Eye aria-hidden="true" className="size-5" />
        )}
      </button>
    </div>
  );
}
