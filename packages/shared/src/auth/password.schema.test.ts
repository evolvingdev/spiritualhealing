import { describe, expect, it } from 'vitest';
import { PASSWORD_MAX_BYTES, PASSWORD_MIN_LENGTH, passwordSchema } from './password.schema.js';

const issueOf = (value: string): string | undefined =>
  passwordSchema.safeParse(value).error?.issues[0]?.message;

describe('passwordSchema', () => {
  it('accepts a password of exactly the minimum length', () => {
    expect(passwordSchema.safeParse('a'.repeat(PASSWORD_MIN_LENGTH)).success).toBe(true);
  });

  it('rejects one character short of the minimum', () => {
    expect(issueOf('a'.repeat(PASSWORD_MIN_LENGTH - 1))).toBe('too_short');
  });

  it('imposes no composition rules', () => {
    expect(passwordSchema.safeParse('correct horse battery').success).toBe(true);
  });

  it('counts characters, not UTF-16 units, so emoji are not double-counted', () => {
    expect(issueOf('🙂'.repeat(PASSWORD_MIN_LENGTH - 1))).toBe('too_short');
  });

  it('accepts Devanagari passphrases', () => {
    expect(passwordSchema.safeParse('शांति और प्रकाश').success).toBe(true);
  });

  it('accepts exactly the bcrypt byte limit and rejects one byte more', () => {
    expect(passwordSchema.safeParse('a'.repeat(PASSWORD_MAX_BYTES)).success).toBe(true);
    expect(issueOf('a'.repeat(PASSWORD_MAX_BYTES + 1))).toBe('too_long');
  });

  it('measures the byte limit in UTF-8 (each Devanagari letter is three bytes)', () => {
    expect(issueOf('श'.repeat(PASSWORD_MAX_BYTES / 3 + 1))).toBe('too_long');
  });

  it('rejects non-strings', () => {
    expect(passwordSchema.safeParse(123_456_789_012).success).toBe(false);
  });
});
