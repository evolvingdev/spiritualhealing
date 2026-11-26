import { describe, expect, it } from 'vitest';
import { signInLinkError, signInReasonMessage } from './sign-in-notices';

describe('sign-in notices from the URL', () => {
  it('maps known reasons to messages', () => {
    expect(signInReasonMessage('session_ended')).toBe('reasonSessionEnded');
    expect(signInReasonMessage('reauth')).toBe('reasonReauth');
  });

  it('ignores anything else, so the URL cannot inject text', () => {
    expect(signInReasonMessage('<script>')).toBeNull();
    expect(signInReasonMessage(undefined)).toBeNull();
    expect(signInLinkError('internal_error')).toBeNull();
  });

  it('accepts only the errors route handlers report', () => {
    expect(signInLinkError('link_invalid')).toBe('link_invalid');
    expect(signInLinkError('oauth_failed')).toBe('oauth_failed');
  });
});
