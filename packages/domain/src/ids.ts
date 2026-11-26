declare const brand: unique symbol;

type Brand<Value, Name extends string> = Value & { readonly [brand]: Name };

export type UserId = Brand<string, 'UserId'>;
export type SessionId = Brand<string, 'SessionId'>;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

export function parseUserId(value: string): UserId | null {
  // Branding is the point of this function: the cast is only reached after the format check.
  return isUuid(value) ? (value as UserId) : null;
}

export function parseSessionId(value: string): SessionId | null {
  // Branding is the point of this function: the cast is only reached after the format check.
  return isUuid(value) ? (value as SessionId) : null;
}
