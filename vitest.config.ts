import { defineConfig } from 'vitest/config';

/** Unit tests across the workspace. API integration tests run separately (`pnpm test:integration`). */
export default defineConfig({
  test: {
    projects: ['packages/domain', 'packages/shared', 'apps/api', 'apps/web'],
  },
});
