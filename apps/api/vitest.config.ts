import { fileURLToPath } from 'node:url';
import swc from 'unplugin-swc';
import { defineConfig, type ViteUserConfig } from 'vitest/config';

const workspacePackage = (name: string): string =>
  fileURLToPath(new URL(`../../packages/${name}/src/index.ts`, import.meta.url));

/** Shared by the unit and integration configs. */
export const apiTestBase: ViteUserConfig = {
  // Nest relies on legacy decorators with emitted metadata, which only SWC (not the default
  // transformer) compiles here.
  plugins: [
    swc.vite({
      jsc: {
        parser: { syntax: 'typescript', decorators: true },
        transform: { legacyDecorator: true, decoratorMetadata: true },
        target: 'es2022',
      },
      module: { type: 'es6' },
    }),
  ],
  oxc: false,
  resolve: {
    // Test workspace packages from source, so tests never run against a stale build.
    alias: {
      '@spiritualhealing/db': workspacePackage('db'),
      '@spiritualhealing/domain': workspacePackage('domain'),
      '@spiritualhealing/shared': workspacePackage('shared'),
    },
  },
};

export default defineConfig({
  ...apiTestBase,
  test: {
    name: 'api',
    include: ['src/**/*.test.ts'],
    setupFiles: ['reflect-metadata'],
  },
});
