// Глобалы, которые в рантайме предоставляет React Native, а в Jest — нет.
global.__DEV__ = true;

// expo-secure-store — нативный модуль (Keychain/Keystore); в тестах — память процесса.
jest.mock('expo-secure-store', () => {
  const store = new Map();
  return {
    getItemAsync: jest.fn(async (key) => (store.has(key) ? store.get(key) : null)),
    setItemAsync: jest.fn(async (key, value) => {
      store.set(key, String(value));
    }),
    deleteItemAsync: jest.fn(async (key) => {
      store.delete(key);
    }),
  };
});
