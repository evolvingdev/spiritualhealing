import { execFileSync } from 'node:child_process';
import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import postgres from 'postgres';

/**
 * Test-only helpers for the LOCAL Supabase stack (never a hosted project): Mailpit for emails,
 * the local admin API to arrange users, and the local database to arrange roles.
 */
const LOCAL_AUTH_URL = 'http://127.0.0.1:55321/auth/v1';
const MAILPIT_API_URL = 'http://127.0.0.1:55324/api/v1';
const LOCAL_DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:55322/postgres';
const MAIL_POLL_INTERVAL_MS = 500;
const MAIL_POLL_ATTEMPTS = 40;
const TOTP_STEP_SECONDS = 30;
const TOTP_DIGITS = 6;

function readLocalStatus(name: string): string {
  const output = execFileSync('pnpm', ['exec', 'supabase', 'status', '-o', 'env'], {
    encoding: 'utf8',
    shell: process.platform === 'win32',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  const line = output.split(/\r?\n/).find((entry) => entry.startsWith(`${name}=`));
  if (line === undefined) {
    throw new Error(`Local Supabase status has no ${name}: is the stack running?`);
  }
  return line.slice(name.length + 1).replace(/^"|"$/g, '');
}

export function uniqueEmail(label: string): string {
  return `e2e-${label}-${randomUUID()}@example.test`;
}

export function uniquePassword(): string {
  return `calm-${randomBytes(12).toString('base64url')}`;
}

/** A confirmed account, created through the local admin API (skips the email round trip). */
export async function createConfirmedUser(email: string, password: string): Promise<string> {
  const secretKey = readLocalStatus('SECRET_KEY');
  const response = await fetch(`${LOCAL_AUTH_URL}/admin/users`, {
    method: 'POST',
    headers: {
      apikey: secretKey,
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  if (!response.ok) {
    throw new Error(`Could not create the test user: ${response.status}`);
  }
  const body = (await response.json()) as { id: string };
  return body.id;
}

/** What an admin does through the runbook or the admin screen, arranged directly. */
export async function grantRole(userId: string, role: 'practitioner' | 'admin'): Promise<void> {
  const sql = postgres(LOCAL_DATABASE_URL, { max: 1, onnotice: () => undefined });
  try {
    await sql`insert into app.user_roles (user_id, role) values (${userId}, ${role}) on conflict do nothing`;
  } finally {
    await sql.end();
  }
}

interface MailpitMessage {
  readonly ID: string;
  readonly Created: string;
}

/** The newest email to `to` received after `since`, as plain text and HTML. */
export async function waitForEmail(
  to: string,
  since: Date,
): Promise<{ readonly text: string; readonly html: string }> {
  const query = encodeURIComponent(`to:"${to}"`);
  for (let attempt = 0; attempt < MAIL_POLL_ATTEMPTS; attempt += 1) {
    const list = (await (await fetch(`${MAILPIT_API_URL}/search?query=${query}`)).json()) as {
      messages?: MailpitMessage[];
    };
    const message = list.messages?.find(({ Created }) => new Date(Created) >= since);
    if (message !== undefined) {
      const full = (await (await fetch(`${MAILPIT_API_URL}/message/${message.ID}`)).json()) as {
        Text: string;
        HTML: string;
      };
      return { text: full.Text, html: full.HTML };
    }
    await new Promise((resolve) => setTimeout(resolve, MAIL_POLL_INTERVAL_MS));
  }
  throw new Error(`No email to ${to}`);
}

export function readCode(text: string): string {
  const match = /\b(\d{6})\b/.exec(text);
  if (match?.[1] === undefined) {
    throw new Error('No 6-digit code in the email');
  }
  return match[1];
}

/** The first link in the email, as a path on this site (the template links to SITE_URL). */
export function readLinkPath(html: string): string {
  const match = /href="([^"]+)"/.exec(html);
  if (match?.[1] === undefined) {
    throw new Error('No link in the email');
  }
  const url = new URL(match[1].replaceAll('&amp;', '&'));
  return `${url.pathname}${url.search}`;
}

function base32Decode(value: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const character of value.replace(/=+$/, '').toUpperCase()) {
    bits += alphabet.indexOf(character).toString(2).padStart(5, '0');
  }
  const bytes: number[] = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) {
    bytes.push(Number.parseInt(bits.slice(index, index + 8), 2));
  }
  return Buffer.from(bytes);
}

/** RFC 6238 TOTP, as an authenticator app computes it. */
export function totpCode(secret: string, at: Date = new Date()): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(at.getTime() / 1000 / TOTP_STEP_SECONDS)));
  const hmac = createHmac('sha1', base32Decode(secret)).update(counter).digest();
  const offset = (hmac.at(-1) ?? 0) & 0x0f;
  const binary = hmac.readUInt32BE(offset) & 0x7fffffff;
  return String(binary % 10 ** TOTP_DIGITS).padStart(TOTP_DIGITS, '0');
}
