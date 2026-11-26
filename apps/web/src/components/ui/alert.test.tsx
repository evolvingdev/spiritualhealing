import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Alert } from './alert';

describe('Alert', () => {
  afterEach(cleanup);

  it('announces errors immediately', () => {
    render(<Alert tone="error">Something failed</Alert>);
    expect(screen.getByRole('alert').textContent).toBe('Something failed');
  });

  it.each(['success', 'info'] as const)('announces %s politely', (tone) => {
    render(<Alert tone={tone}>Saved</Alert>);
    expect(screen.getByRole('status').textContent).toBe('Saved');
  });

  it('uses an icon as well as colour, which assistive technology ignores', () => {
    render(<Alert tone="error">Something failed</Alert>);
    expect(screen.getByRole('alert').querySelector('svg')?.getAttribute('aria-hidden')).toBe(
      'true',
    );
  });
});
