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
        files: ['packages/api-client/src/client/api-client.ts'],
        plugins: ['typescript'],
        rules: { 'no-unsafe-type-assertion': 'off' },
      },
      {
        // Zod introspection walker: reads opaque _def/def internals to derive
        // CredentialFields from arbitrary plugin schemas. Every access starts
        // from `unknown` and narrows after a runtime shape check, so the
        // narrowing assertions at this seam are intentional.
        files: ['packages/api-contracts/src/shared/credentials/describe-credential-fields.ts'],
        plugins: ['typescript'],
        rules: { 'no-unsafe-type-assertion': 'off' },
      },
      {
        // Shadcn-installed primitives ship with patterns the project lints
        // stricter than the upstream registry — `open` shadowing inside
        // controlled open/setOpen pairs, and `style={{...} as React.CSSProperties}`
        // for CSS custom properties. Forking each primitive on every shadcn
        // update is worse than scoping these rules off at the install boundary.
        files: ['apps/web/src/components/primitives/**'],
        plugins: ['typescript', 'react'],
        rules: {
          'react-hooks/rules-of-hooks': 'error',
          'no-shadow': 'off',
          'no-unsafe-type-assertion': 'off',
        },
      },
      {
        files: ['**/__test__/**/*.spec.ts'],
        plugins: ['typescript', 'vitest'],
        // Test doubles cast structural fakes to repository class types (whose
        // private members can't be satisfied structurally), and inline vi.fn()
        // stubs don't need explicit generics — both are intentional in specs.
        rules: {
          'no-unsafe-type-assertion': 'off',
          'vitest/require-mock-type-parameters': 'off',
        },
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
      // The web project lives in apps/web/vite.config.ts so its jsdom
      // environment and React plugin resolve from the web package, not root.
      './apps/web/vite.config.ts',
      {
        resolve: { alias: { '@kizunu/api': apiSrc } },
        test: {
          name: 'unit',
          environment: 'node',
          include: ['**/src/**/__test__/unit/**/*.spec.ts'],
          setupFiles: ['./apps/api/src/__test__/unit/setup.ts'],
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
