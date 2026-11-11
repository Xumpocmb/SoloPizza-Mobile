module.exports = {
  preset: 'jest-expo',
  setupFiles: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@react-native-async-storage/async-storage$':
      '<rootDir>/__mocks__/@react-native-async-storage/async-storage.js',
    '^react-native-safe-area-context$':
      '<rootDir>/__mocks__/react-native-safe-area-context.js',
    '^@react-native-vector-icons/(.*)$': '<rootDir>/__mocks__/vector-icons.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-native-vector-icons|expo(nent)?|@expo(nent)?/.*|@react-navigation/.*|react-redux|@reduxjs|redux|redux-thunk|reselect|immer|use-sync-external-store))',
  ],
};
