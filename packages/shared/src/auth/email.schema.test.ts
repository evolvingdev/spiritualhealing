import { describe, expect, it } from 'vitest';
import { EMAIL_MAX_LENGTH, emailSchema } from './email.schema.js';

describe('emailSchema', () => {
  it('trims and lowercases', () => {
    expect(emailSchema.parse('  Someone@Example.TEST ')).toBe('someone@example.test');
  });

  it.each(['', 'not-an-email', 'a@', '@example.test', 'a b@example.test', '<script>@x.test'])(
    'rejects %j',
    (value) => {
      expect(emailSchema.safeParse(value).success).toBe(false);
    },
  );

  it('rejects addresses longer than the RFC limit', () => {
    const domain = `${Array.from({ length: 4 }, () => 'b'.repeat(46)).join('.')}.test`;
    const address = `${'a'.repeat(64)}@${domain}`;
    expect(address.length).toBeGreaterThan(EMAIL_MAX_LENGTH);
    expect(emailSchema.safeParse(address).success).toBe(false);
  });
});
