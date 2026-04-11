// Flat config for ESLint 10 + typescript-eslint 8.
// Keep this minimal — the goal is to catch obvious mistakes without
// blocking development. Expand cautiously.
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**', '**/__tests__/**', '*.config.*', 'jest.config.js'],
  },
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.ts'],
    rules: {
      // Project conventions intentionally use `any` for Jest mock shapes
      // and for genuinely-unknown values at system boundaries. Prefer
      // `unknown`, but do not fail the build on existing call sites.
      '@typescript-eslint/no-explicit-any': 'off',
      // The analyzer uses non-null assertions in controlled places after
      // length checks / regex matches; these are ergonomic, not risky.
      '@typescript-eslint/no-non-null-assertion': 'off',
      // Allow `_prefixed` unused args for interface conformance.
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
);
