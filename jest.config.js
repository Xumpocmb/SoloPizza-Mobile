/**
 * ОБНОВЛЕНО ПРИ АУДИТЕ 31.10.2026.
 *
 * Добавлены:
 *  - setupFiles — глобал __DEV__ и мок AsyncStorage (нужны до импорта модулей);
 *  - moduleNameMapper — подмена нативных модулей на JS-моки, чтобы smoke-тест
 *    мог собрать store / сервисы / навигатор без эмулятора;
 *  - transformIgnorePatterns — babel должен обрабатывать ES-модули из node_modules.
 */
module.exports = {
  preset: 'react-native',
  setupFiles: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@react-native-async-storage/async-storage$':
      '<rootDir>/__mocks__/@react-native-async-storage/async-storage.js',
    '^react-native-safe-area-context$':
      '<rootDir>/__mocks__/react-native-safe-area-context.js',
    '^react-native-vector-icons/(.*)$': '<rootDir>/__mocks__/vector-icons.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|react-native-vector-icons|react-native-safe-area-context|react-native-screens|react-redux|@reduxjs|redux|redux-thunk|reselect|immer|use-sync-external-store)/)',
  ],
  testPathIgnorePatterns: ['/node_modules/', '/android/', '/ios/'],
};
