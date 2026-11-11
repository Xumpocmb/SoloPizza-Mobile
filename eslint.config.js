const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const globals = require('globals');

module.exports = defineConfig([
  expoConfig,
  { ignores: ['dist/*', '.expo/*'] },
  {
    // Экраны грузят данные при открытии и ставят setLoading(true) в начале — это подсказка
    // о лишнем рендере, а не ошибка. shortcut: правило как warn, вернуть error, когда экраны
    // корзины/заказов/профиля перепишутся на серверный API (этапы Б1–Б3)
    rules: { 'react-hooks/set-state-in-effect': 'warn' },
  },
  {
    files: ['__tests__/**', '__mocks__/**', 'jest.setup.js'],
    languageOptions: { globals: { ...globals.jest, ...globals.node } },
  },
]);
