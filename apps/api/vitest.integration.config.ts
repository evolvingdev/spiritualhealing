import { defineConfig } from 'vitest/config';
import { apiTestBase } from './vitest.config.js';

const CONTAINER_STARTUP_TIMEOUT_MS = 180_000;
const INTEGRATION_TEST_TIMEOUT_MS = 30_000;

/** API integration tests against a real Postgres in Docker (Testcontainers, ADR 0011). */
export default defineConfig({
  ...apiTestBase,
  test: {
    name: 'api-integration',
    include: ['test/**/*.int.test.ts'],
    setupFiles: ['reflect-metadata'],
    globalSetup: ['test/support/global-setup.ts'],
    hookTimeout: CONTAINER_STARTUP_TIMEOUT_MS,
    testTimeout: INTEGRATION_TEST_TIMEOUT_MS,
  },
});
