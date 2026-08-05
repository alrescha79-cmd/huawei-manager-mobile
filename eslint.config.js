// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier');

module.exports = defineConfig([
  expoConfig,
  prettierConfig,
  {
    ignores: ['graphify-out/', 'android/', 'ios/', 'scripts/'],
  },
  {
    rules: {
      // React Compiler-era rules are stricter than this codebase's patterns;
      // the valuable subset (rules-of-hooks, exhaustive-deps) stays on.
      'react-hooks/refs': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      // Lazy require() is used deliberately to break store circular deps.
      '@typescript-eslint/no-require-imports': 'off',
      'react-hooks/exhaustive-deps': 'warn',
      'react/display-name': 'off',
    },
  },
]);
