import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const fromHere = (path: string): string =>
  fileURLToPath(new URL(path, import.meta.url)).replaceAll('\\', '/');

/** Unit and component tests for the web app. End-to-end tests run with Playwright (`e2e/`). */
export default defineConfig({
  oxc: { jsx: { runtime: 'automatic' } },
  resolve: {
    alias: [
      { find: /^@\//, replacement: `${fromHere('./src')}/` },
      // Tests use the shared package's source, so they never run against a stale build.
      {
        find: '@spiritualhealing/shared',
        replacement: fromHere('../../packages/shared/src/index.ts'),
      },
    ],
  },
  test: {
    name: 'web',
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'jsdom',
  },
});
