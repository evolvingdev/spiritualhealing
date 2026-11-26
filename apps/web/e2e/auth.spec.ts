import { expect, test } from '@playwright/test';
import {
  completeOnboarding,
  expectNoAccessibilityViolations,
  signInWithPassword,
  signOut,
} from './support/flows';
import {
  createConfirmedUser,
  readCode,
  readLinkPath,
  uniqueEmail,
  uniquePassword,
  waitForEmail,
} from './support/local-stack';

test.describe('signing up and in', () => {
  test('sign up, confirm the email, accept the terms and reach the account', async ({ page }) => {
    const email = uniqueEmail('signup');
    await page.goto('/sign-up');
    await expectNoAccessibilityViolations(page);
    await page.getByLabel('Email address').fill(email);
    await page.getByLabel('Password', { exact: true }).fill(uniquePassword());
    const sentAfter = new Date(Date.now() - 1_000);
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByText(/Check your inbox/)).toBeVisible();

    const confirmation = await waitForEmail(email, sentAfter);
    await page.goto(readLinkPath(confirmation.html));
    await expectNoAccessibilityViolations(page);
    await completeOnboarding(page);

    await expect(page.getByRole('heading', { name: 'Your account' })).toBeVisible();
    await expect(page.getByText('Member')).toBeVisible();
    await expect(page.getByText(`Signed in as ${email}`)).toBeVisible();
    await expectNoAccessibilityViolations(page);
  });

  test('refuses to continue without every confirmation', async ({ page }) => {
    const email = uniqueEmail('consent');
    const password = uniquePassword();
    await createConfirmedUser(email, password);
    await signInWithPassword(page, email, password);
    await page.getByRole('checkbox', { name: /18 years of age or older/ }).click();
    await page.getByRole('button', { name: 'Agree and continue' }).click();
    await expect(page.getByText('Please confirm this to continue.')).toHaveCount(2);
    await expect(page.getByRole('heading', { name: 'Before you begin' })).toBeVisible();
  });

  test('sign in with a password and sign out', async ({ page }) => {
    const email = uniqueEmail('password');
    const password = uniquePassword();
    await createConfirmedUser(email, password);
    await signInWithPassword(page, email, password);
    await completeOnboarding(page);
    await expect(page.getByRole('heading', { name: 'Your account' })).toBeVisible();

    await signOut(page);
    await page.goto('/account');
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  });

  test('gives one generic answer for a wrong password and an unknown account', async ({ page }) => {
    const email = uniqueEmail('wrong');
    await createConfirmedUser(email, uniquePassword());
    const generic =
      'The email or password is incorrect, or the email address has not been confirmed yet.';

    await signInWithPassword(page, email, 'not the right password');
    await expect(page.getByRole('main').getByRole('alert')).toHaveText(generic);
    await signInWithPassword(page, uniqueEmail('nobody'), 'not the right password');
    await expect(page.getByRole('main').getByRole('alert')).toHaveText(generic);
  });

  test('sign in with an emailed code, as a brand-new person', async ({ page }) => {
    const email = uniqueEmail('code');
    await page.goto('/sign-in/code');
    await page.getByLabel('Email address').fill(email);
    const sentAfter = new Date(Date.now() - 1_000);
    await page.getByRole('button', { name: 'Email me a code' }).click();
    await expect(page.getByText(/a code is on its way/)).toBeVisible();

    const message = await waitForEmail(email, sentAfter);
    await page.getByLabel('6-digit code').fill(readCode(message.text));
    await page.getByRole('button', { name: 'Sign in' }).click();
    await completeOnboarding(page);
    await expect(page.getByRole('heading', { name: 'Your account' })).toBeVisible();
  });

  test('reset a forgotten password through the emailed link', async ({ page }) => {
    const email = uniqueEmail('reset');
    const oldPassword = uniquePassword();
    const newPassword = uniquePassword();
    await createConfirmedUser(email, oldPassword);

    await page.goto('/forgot-password');
    await page.getByLabel('Email address').fill(email);
    const sentAfter = new Date(Date.now() - 1_000);
    await page.getByRole('button', { name: 'Send reset link' }).click();
    await expect(page.getByText(/a reset link is on its way/)).toBeVisible();

    const message = await waitForEmail(email, sentAfter);
    await page.goto(readLinkPath(message.html));
    await expect(page.getByRole('heading', { name: 'Choose a new password' })).toBeVisible();
    await page.getByLabel('New password').fill(newPassword);
    await page.getByRole('button', { name: 'Save new password' }).click();
    await completeOnboarding(page);
    await expect(page.getByRole('heading', { name: 'Your account' })).toBeVisible();

    await signOut(page);
    await signInWithPassword(page, email, oldPassword);
    await expect(page.getByRole('main').getByRole('alert')).toBeVisible();
    await signInWithPassword(page, email, newPassword);
    await expect(page.getByRole('heading', { name: 'Your account' })).toBeVisible();
  });

  test('answers a reset request for an unknown address exactly like a known one', async ({
    page,
  }) => {
    await page.goto('/forgot-password');
    await page.getByLabel('Email address').fill(uniqueEmail('unknown'));
    await page.getByRole('button', { name: 'Send reset link' }).click();
    await expect(page.getByText(/If an account uses this address/)).toBeVisible();
  });

  test('works with the keyboard alone', async ({ page }) => {
    const email = uniqueEmail('keyboard');
    const password = uniquePassword();
    await createConfirmedUser(email, password);
    await page.goto('/sign-in');
    await page.getByLabel('Email address').focus();
    await page.keyboard.type(email);
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.type(password);
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: 'Before you begin' })).toBeVisible();
  });
});

test.describe('language and security headers', () => {
  test('serves Hindi at /hi-IN with the right language attribute', async ({ page }) => {
    await page.goto('/hi-IN/sign-in');
    await expect(page.locator('html')).toHaveAttribute('lang', 'hi-IN');
    await expect(page.getByRole('heading', { name: 'साइन इन करें' })).toBeVisible();
    await expectNoAccessibilityViolations(page);
  });

  test('sends a nonce-based CSP and the other security headers', async ({ page }) => {
    const response = await page.goto('/sign-in');
    const headers = response?.headers() ?? {};
    expect(headers['content-security-policy']).toMatch(
      /script-src 'self' 'nonce-[^']+' 'strict-dynamic'/,
    );
    expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['x-powered-by']).toBeUndefined();
  });

  test('keeps session cookies away from page scripts', async ({ page, context }) => {
    const email = uniqueEmail('cookies');
    const password = uniquePassword();
    await createConfirmedUser(email, password);
    await signInWithPassword(page, email, password);
    await expect(page.getByRole('heading', { name: 'Before you begin' })).toBeVisible();
    const sessionCookies = (await context.cookies()).filter(({ name }) => name.startsWith('sb-'));
    expect(sessionCookies.length).toBeGreaterThan(0);
    for (const cookie of sessionCookies) {
      expect(cookie).toMatchObject({ httpOnly: true, sameSite: 'Lax', path: '/' });
    }
    expect(await page.evaluate(() => document.cookie)).not.toContain('sb-');
  });

  test('does not redirect to another site after sign-in', async ({ page }) => {
    const email = uniqueEmail('redirect');
    const password = uniquePassword();
    await createConfirmedUser(email, password);
    await page.goto('/sign-in?next=https://evil.example/');
    await page.getByLabel('Email address').fill(email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('heading', { name: 'Before you begin' })).toBeVisible();
    expect(new URL(page.url()).host).toBe('localhost:3000');
  });
});
