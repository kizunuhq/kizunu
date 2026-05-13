import { defineConfig } from 'vite-plus'

export default defineConfig({
  lint: {
    ignorePatterns: ['dist/**', 'node_modules/**', '.claude/**'],
    options: { typeAware: true, typeCheck: true },
    rules: {
      'no-unused-vars': 'error',
    },
    overrides: [
      {
        files: ['apps/web/**'],
        plugins: ['react'],
        rules: { 'react-hooks/rules-of-hooks': 'error' },
      },
      {
        files: ['apps/api/**'],
        rules: { 'no-console': 'off' },
      },
    ],
  },
  fmt: {
    ignorePatterns: ['dist/**', '.claude/**'],
    singleQuote: true,
    semi: false,
    sortPackageJson: true,
    sortImports: true,
  },
  run: {
    cache: true,
  },
  test: {
    include: ['apps/**/*.spec.ts', 'packages/**/*.spec.ts'],
    passWithNoTests: true,
  },
})
