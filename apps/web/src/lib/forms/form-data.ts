import type { z } from 'zod';
import type { FieldErrorKey } from './action-state';

/** Custom issue messages used by our schemas, mapped to translatable field errors. */
const CUSTOM_MESSAGE_KEYS: Readonly<Record<string, FieldErrorKey>> = {
  too_short: 'passwordTooShort',
  too_long: 'passwordTooLong',
  invalid_code: 'invalidCode',
  must_accept: 'mustAccept',
};

function fieldErrorKeyFor(issue: z.core.$ZodIssue): FieldErrorKey {
  const custom = CUSTOM_MESSAGE_KEYS[issue.message];
  if (custom !== undefined) {
    return custom;
  }
  if (issue.code === 'invalid_format' && issue.format === 'email') {
    return 'invalidEmail';
  }
  return 'required';
}

/** Only text fields of the form; files are never accepted by these actions. */
export function readTextFields(formData: FormData): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const [name, value] of formData.entries()) {
    if (typeof value === 'string' && !name.startsWith('$ACTION')) {
      fields[name] = value;
    }
  }
  return fields;
}

export type ParsedForm<T> =
  | { readonly success: true; readonly data: T }
  | { readonly success: false; readonly fieldErrors: Record<string, FieldErrorKey> };

/** Validates form fields with a schema, producing one translatable error per field. */
export function parseForm<T>(schema: z.ZodType<T>, formData: FormData): ParsedForm<T> {
  const result = schema.safeParse(readTextFields(formData));
  if (result.success) {
    return { success: true, data: result.data };
  }
  const fieldErrors: Record<string, FieldErrorKey> = {};
  for (const issue of result.error.issues) {
    const field = String(issue.path[0] ?? 'form');
    fieldErrors[field] ??= fieldErrorKeyFor(issue);
  }
  return { success: false, fieldErrors };
}
