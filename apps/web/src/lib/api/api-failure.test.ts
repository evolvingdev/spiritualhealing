import { describe, expect, it, vi } from 'vitest';

// The client module reads request headers and cookies; only its pure envelope parsing is tested here.
vi.mock('next/headers', () => ({ headers: vi.fn(), cookies: vi.fn() }));

const { toFailure } = await import('./api-client');

describe('toFailure', () => {
  it('reads the stable code and field details from the API envelope', () => {
    const failure = toFailure(400, {
      error: {
        code: 'validation_error',
        message: 'The request is invalid.',
        details: [{ path: 'password', message: 'too_short' }],
        correlationId: '6f1c1a52-1f6a-4f43-9d1e-6a1d2a8c1b11',
      },
    });
    expect(failure).toEqual({
      ok: false,
      status: 400,
      code: 'validation_error',
      fieldErrors: { password: 'too_short' },
    });
  });

  it('treats anything that is not our envelope as an internal error', () => {
    expect(toFailure(502, '<html>Bad gateway</html>')).toMatchObject({ code: 'internal_error' });
    expect(toFailure(500, { error: { code: 'made_up' } })).toMatchObject({
      code: 'internal_error',
    });
  });
});
