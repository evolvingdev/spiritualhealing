import { z } from 'zod';

/** Length is the only rule (no composition rules), per NIST SP 800-63B and CLAUDE.md. */
export const PASSWORD_MIN_LENGTH = 12;

/** Supabase hashes with bcrypt, which ignores everything after 72 bytes. */
export const PASSWORD_MAX_BYTES = 72;

const TWO_BYTE_LIMIT = 0x80;
const THREE_BYTE_LIMIT = 0x800;
const FOUR_BYTE_LIMIT = 0x10000;

interface PasswordSize {
  /** Characters as users count them (code points), so emoji and Devanagari are not penalised. */
  readonly codePoints: number;
  readonly utf8Bytes: number;
}

function measure(value: string): PasswordSize {
  let codePoints = 0;
  let utf8Bytes = 0;
  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;
    codePoints += 1;
    if (codePoint < TWO_BYTE_LIMIT) {
      utf8Bytes += 1;
    } else if (codePoint < THREE_BYTE_LIMIT) {
      utf8Bytes += 2;
    } else if (codePoint < FOUR_BYTE_LIMIT) {
      utf8Bytes += 3;
    } else {
      utf8Bytes += 4;
    }
  }
  return { codePoints, utf8Bytes };
}

export const passwordSchema = z
  .string()
  .refine((value) => measure(value).codePoints >= PASSWORD_MIN_LENGTH, { error: 'too_short' })
  .refine((value) => measure(value).utf8Bytes <= PASSWORD_MAX_BYTES, { error: 'too_long' });
