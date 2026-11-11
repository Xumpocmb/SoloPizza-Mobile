const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const globals = require('globals');

module.exports = defineConfig([
  expoConfig,
  { ignores: ['dist/*', '.expo/*'] },
  {
    files: ['__tests__/**', '__mocks__/**', 'jest.setup.js'],
    languageOptions: { globals: { ...globals.jest, ...globals.node } },
  },
]);
