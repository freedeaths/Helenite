import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { globalIgnores } from 'eslint/config'
import prettierConfig from 'eslint-config-prettier'

export default tseslint.config([
  globalIgnores(['dist', 'deprecated/**', 'src/components/DevTools/**']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
      prettierConfig, // This should be last to override conflicting rules
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // Existing code quality - allow current state but discourage
      '@typescript-eslint/no-explicit-any': 'warn',

      // Strict rules for new code - must be fixed
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],

      // Code style consistency
      'prefer-const': 'error',
      'no-useless-escape': 'error',
      'no-case-declarations': 'error',

      // React best practices
      'react-hooks/exhaustive-deps': 'warn', // Allow flexibility for complex effects

      // Allow console in development
      'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    },
  },
])
