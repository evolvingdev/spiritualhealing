import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { checkedField, emailField, newPasswordField, oneTimeCodeField } from './fields';
import { parseForm, readTextFields } from './form-data';

function formData(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [name, value] of Object.entries(entries)) {
    data.append(name, value);
  }
  return data;
}

describe('parseForm', () => {
  const schema = z.object({
    email: emailField,
    password: newPasswordField,
    code: oneTimeCodeField,
    consent: checkedField,
  });

  it('returns the parsed, normalised values', () => {
    const result = parseForm(
      schema,
      formData({
        email: ' Someone@Example.TEST ',
        password: 'a long enough passphrase',
        code: '123456',
        consent: 'on',
      }),
    );
    expect(result).toEqual({
      success: true,
      data: {
        email: 'someone@example.test',
        password: 'a long enough passphrase',
        code: '123456',
        consent: 'on',
      },
    });
  });

  it('maps each failing field to one translatable error', () => {
    const result = parseForm(schema, formData({ email: 'nope', password: 'short', code: '12a' }));
    expect(result).toEqual({
      success: false,
      fieldErrors: {
        email: 'invalidEmail',
        password: 'passwordTooShort',
        code: 'invalidCode',
        consent: 'mustAccept',
      },
    });
  });

  it('asks for an empty email rather than calling it invalid', () => {
    const result = parseForm(z.object({ email: emailField }), formData({ email: '' }));
    expect(result).toEqual({ success: false, fieldErrors: { email: 'required' } });
  });
});

describe('readTextFields', () => {
  it('drops Next.js action metadata and files', () => {
    const data = formData({ email: 'a@b.test', $ACTION_ID_abc: '' });
    data.append('upload', new Blob(['x']), 'x.txt');
    expect(readTextFields(data)).toEqual({ email: 'a@b.test' });
  });
});
