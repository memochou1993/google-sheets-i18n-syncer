import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import globals from 'globals';

const compat = new FlatCompat();

export default [
  js.configs.recommended,
  ...compat.config({
    plugins: ['import'],
    extends: ['plugin:import/errors', 'plugin:import/warnings'],
  }),
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.es2022,
      },
    },
    rules: {
      'no-console': 'off',
      'import/extensions': ['error', 'ignorePackages'],
      'semi': ['error', 'always'],
      'quotes': ['error', 'single'],
      'indent': ['error', 2],
      'comma-dangle': ['error', 'always-multiline'],
    },
    ignores: [
      'node_modules/',
      'coverage/',
      'dist/',
      '**/*.min.js',
      'translations/*.json',
      'credentials.json',
    ],
  },
];
