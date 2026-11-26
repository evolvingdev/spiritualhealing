import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Input } from '@/components/ui/input';
import { renderWithIntl } from '@/test/render';
import { FormField } from './form-field';

describe('FormField', () => {
  afterEach(cleanup);

  it('labels its control', () => {
    renderWithIntl(
      <FormField label="Email address">
        <Input name="email" />
      </FormField>,
    );
    expect(screen.getByLabelText('Email address').getAttribute('name')).toBe('email');
  });

  it('links the hint and the error to the control and marks it invalid', () => {
    renderWithIntl(
      <FormField label="Password" hint="At least 12 characters." error="passwordTooShort">
        <Input name="password" />
      </FormField>,
    );
    const input = screen.getByLabelText('Password');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    const describedBy = (input.getAttribute('aria-describedby') ?? '').split(' ');
    const [hint, error] = describedBy.map((id) => document.getElementById(id)?.textContent);
    expect(hint).toBe('At least 12 characters.');
    expect(error).toContain('Use at least 12 characters');
  });

  it('is not marked invalid without an error', () => {
    renderWithIntl(
      <FormField label="Email address">
        <Input name="email" />
      </FormField>,
    );
    expect(screen.getByLabelText('Email address').hasAttribute('aria-invalid')).toBe(false);
  });
});
