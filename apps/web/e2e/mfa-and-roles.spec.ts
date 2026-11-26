import { expect, test } from '@playwright/test';
import {
  completeOnboarding,
  enrollAuthenticator,
  expectNoAccessibilityViolations,
  signInWithPassword,
  signOut,
} from './support/flows';
import {
  createConfirmedUser,
  grantRole,
  totpCode,
  uniqueEmail,
  uniquePassword,
} from './support/local-stack';

const TOTP_STEP_MS = 30_000;

test.describe('two-step verification', () => {
  test('a client turns on an authenticator, then needs it to sign in', async ({ page }) => {
    const email = uniqueEmail('totp');
    const password = uniquePassword();
    await createConfirmedUser(email, password);
    await signInWithPassword(page, email, password);
    await completeOnboarding(page);

    await page.goto('/account/security');
    await expectNoAccessibilityViolations(page);
    await page.getByRole('link', { name: 'Add an authenticator app' }).click();
    const secret = await enrollAuthenticator(page);
    await expect(page.getByRole('heading', { name: 'Security' })).toBeVisible();
    await expect(page.getByText(/Authenticator app \(added/)).toBeVisible();

    await signOut(page);
    await signInWithPassword(page, email, password);
    await expect(
      page.getByText('Enter the 6-digit code from your authenticator app.'),
    ).toBeVisible();
    await page
      .getByLabel('6-digit code')
      .fill(totpCode(secret, new Date(Date.now() + TOTP_STEP_MS)));
    await page.getByRole('button', { name: 'Verify' }).click();
    await expect(page.getByRole('heading', { name: 'Your account' })).toBeVisible();
  });

  test('a practitioner must set up an authenticator before anything else', async ({ page }) => {
    const email = uniqueEmail('practitioner');
    const password = uniquePassword();
    const userId = await createConfirmedUser(email, password);
    await grantRole(userId, 'practitioner');

    await signInWithPassword(page, email, password);
    await expect(page.getByText('Your role requires two-step verification')).toBeVisible();
    await expectNoAccessibilityViolations(page);
    await enrollAuthenticator(page);
    await completeOnboarding(page);
    await expect(page.getByText('Practitioner', { exact: true })).toBeVisible();
  });

  test('changes the password from security settings right after signing in', async ({ page }) => {
    const email = uniqueEmail('change');
    const password = uniquePassword();
    await createConfirmedUser(email, password);
    await signInWithPassword(page, email, password);
    await completeOnboarding(page);
    await page.goto('/account/security');
    await page.getByLabel('New password').fill(uniquePassword());
    await page.getByRole('button', { name: 'Change password' }).click();
    await expect(page.getByText(/Your password has been changed/)).toBeVisible();
  });
});

test.describe('admin', () => {
  test('an admin grants the practitioner role, which then requires MFA', async ({
    page,
    browser,
  }) => {
    const memberEmail = uniqueEmail('member');
    const memberPassword = uniquePassword();
    await createConfirmedUser(memberEmail, memberPassword);

    const adminEmail = uniqueEmail('admin');
    const adminPassword = uniquePassword();
    await grantRole(await createConfirmedUser(adminEmail, adminPassword), 'admin');
    await signInWithPassword(page, adminEmail, adminPassword);
    await enrollAuthenticator(page);
    await completeOnboarding(page);

    await page.getByRole('link', { name: /Practitioner access/ }).click();
    await expectNoAccessibilityViolations(page);
    await page.getByLabel('Email address').fill(memberEmail);
    await page.getByRole('button', { name: 'Look up' }).click();
    await expect(page.getByText('Current roles: none')).toBeVisible();
    await page.getByRole('button', { name: 'Grant practitioner role' }).click();
    await expect(page.getByText(/The practitioner role has been granted/)).toBeVisible();
    await expect(page.getByText('Current roles: Practitioner')).toBeVisible();

    const memberPage = await (await browser.newContext({ locale: 'en-IN' })).newPage();
    await signInWithPassword(memberPage, memberEmail, memberPassword);
    await expect(memberPage.getByText('Your role requires two-step verification')).toBeVisible();
  });

  test('hides the admin page from everyone else', async ({ page }) => {
    const email = uniqueEmail('not-admin');
    const password = uniquePassword();
    await createConfirmedUser(email, password);
    await signInWithPassword(page, email, password);
    await completeOnboarding(page);
    await page.goto('/admin/practitioners');
    await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
  });
});
