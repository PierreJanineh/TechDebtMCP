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
      // Prefer `unknown` over `any`. Test files are lint-excluded; the
      // narrow production uses at system boundaries are surfaced as warnings
      // without blocking CI, so they can be addressed incrementally.
      '@typescript-eslint/no-explicit-any': 'warn',
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
