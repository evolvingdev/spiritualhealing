import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';
import { totpCode } from './local-stack';

/** Fails the test on any WCAG 2.2 A/AA violation axe can detect on the current page. */
export async function expectNoAccessibilityViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(
    results.violations.map(({ id, nodes }) => ({ id, targets: nodes.map((n) => n.target) })),
  ).toEqual([]);
}

export async function signInWithPassword(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto('/sign-in');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
}

export async function completeOnboarding(page: Page): Promise<void> {
  await expect(page.getByRole('heading', { name: 'Before you begin' })).toBeVisible();
  await page.getByRole('checkbox', { name: /18 years of age or older/ }).click();
  await page.getByRole('checkbox', { name: /Terms of Service/ }).click();
  await page.getByRole('checkbox', { name: /Privacy Notice/ }).click();
  await page.getByRole('button', { name: 'Agree and continue' }).click();
}

/** Sets up an authenticator on the MFA page and returns its secret, for later sign-ins. */
export async function enrollAuthenticator(page: Page): Promise<string> {
  await page.getByRole('button', { name: 'Set up authenticator app' }).click();
  const secret = (await page.locator('code').textContent())?.trim() ?? '';
  expect(secret).toMatch(/^[A-Z2-7]+=*$/);
  await page.getByLabel('6-digit code').fill(totpCode(secret));
  await page.getByRole('button', { name: 'Confirm and turn on' }).click();
  return secret;
}

export async function signOut(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.getByText('You have signed out.')).toBeVisible();
}
