import { describe, expect, it } from 'vitest';
import { parseSessionId, parseUserId } from './ids.js';

describe('parseUserId / parseSessionId', () => {
  const valid = '3f2b8c1e-7d4a-4b6e-9c1f-2a5d8e7b9c01';

  it.each([parseUserId, parseSessionId])('accepts a UUID', (parse) => {
    expect(parse(valid)).toBe(valid);
  });

  it.each(['', 'not-a-uuid', `${valid} `, `${valid}0`, "' OR 1=1 --"])('rejects %j', (value) => {
    expect(parseUserId(value)).toBeNull();
    expect(parseSessionId(value)).toBeNull();
  });
});
