import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vite-plus'

const apiSrc = fileURLToPath(new URL('./apps/api/src', import.meta.url))

export default defineConfig({
  lint: {
    ignorePatterns: [
      'dist/**',
      'node_modules/**',
      '.claude/**',
      '.agents/**',
      'apps/web/src/routeTree.gen.ts',
    ],
    plugins: ['typescript'],
    options: {
      typeAware: true,
      typeCheck: true,
      denyWarnings: !!process.env['CI'],
      reportUnusedDisableDirectives: 'warn',
    },
    categories: {
      correctness: 'error',
      suspicious: 'warn',
    },
    rules: {
      'no-unused-vars': 'error',
      // NestJS modules are decorated empty classes, and dynamic modules expose a
      // static `forRoot`; both are framework-required shapes, not dead classes.
      'no-extraneous-class': ['warn', { allowWithDecorator: true, allowStaticOnly: true }],
    },
    overrides: [
      {
        files: ['apps/web/**'],
        plugins: ['typescript', 'react'],
        rules: { 'react-hooks/rules-of-hooks': 'error' },
      },
      {
        files: ['apps/api/**'],
        plugins: ['typescript', 'node'],
        env: { node: true },
        rules: { 'no-console': 'off' },
      },
      {
        // Compile-time type-assertion utilities use the canonical type-equality
        // idiom `(<T>() => ...) extends (<T>() => ...)`, where each `T` is used
        // once by design — the rule misreads this as an unnecessary parameter.
        files: ['packages/nestjs-shared/src/lib/types/**'],
        plugins: ['typescript'],
        rules: { 'no-unnecessary-type-parameters': 'off' },
      },
      {
        // Generic typed-fetch boundary: parsed JSON cannot be statically proven
        // to match the caller's `T`, so casts at this seam are intentional.
        files: ['apps/web/src/lib/api-client.ts'],
        plugins: ['typescript'],
        rules: { 'no-unsafe-type-assertion': 'off' },
      },
      {
        files: ['**/__test__/**/*.spec.ts'],
        plugins: ['typescript', 'vitest'],
      },
    ],
  },
  fmt: {
    ignorePatterns: [
      'dist/**',
      '.claude/**',
      '.agents/**',
      'docs/**',
      '**/*.md',
      'apps/web/src/routeTree.gen.ts',
    ],
    singleQuote: true,
    semi: false,
    sortPackageJson: true,
    sortImports: true,
    sortTailwindcss: {
      functions: ['cn', 'clsx', 'cva'],
    },
    overrides: [
      {
        files: ['**/*.md'],
        options: { proseWrap: 'always' },
      },
    ],
  },
  run: {
    cache: true,
  },
  test: {
    passWithNoTests: true,
    projects: [
      {
        test: {
          name: 'unit',
          environment: 'node',
          include: ['**/src/**/__test__/unit/**/*.spec.ts'],
        },
      },
      {
        resolve: { alias: { '@kizunu/api': apiSrc } },
        test: {
          name: 'integration',
          environment: 'node',
          include: ['apps/api/src/**/__test__/integration/**/*.spec.ts'],
          globalSetup: ['./apps/api/src/__test__/global-setup.ts'],
          setupFiles: ['./apps/api/src/__test__/integration/setup.ts'],
          // Shared DB: serialize files to avoid races on TRUNCATE.
          fileParallelism: false,
        },
      },
      {
        resolve: { alias: { '@kizunu/api': apiSrc } },
        test: {
          name: 'e2e',
          environment: 'node',
          include: ['apps/api/src/**/__test__/e2e/**/*.spec.ts'],
          globalSetup: ['./apps/api/src/__test__/global-setup.ts'],
          setupFiles: ['./apps/api/src/__test__/e2e/setup.ts'],
          // Shared DB (kizunu_test): serialize files so one e2e's TRUNCATE does
          // not race another (same reason as the integration project).
          fileParallelism: false,
        },
      },
    ],
  },
})
