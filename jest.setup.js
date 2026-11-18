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

// Google Sign-In — нативный модуль. Официальная заглушка пакета закрыта его полем exports,
// поэтому своя: только то, что использует authService/LoginScreen.
jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(async () => true),
    signIn: jest.fn(async () => ({ type: 'cancelled', data: null })),
    signOut: jest.fn(async () => null),
    revokeAccess: jest.fn(async () => null),
  },
  isSuccessResponse: (response) => response?.type === 'success',
  isErrorWithCode: (error) => Boolean(error && typeof error === 'object' && 'code' in error),
  statusCodes: { IN_PROGRESS: 'IN_PROGRESS', PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE' },
}));

// Sign in with Apple — нативный модуль iOS; в тестах — заглушка.
jest.mock('expo-apple-authentication', () => ({
  isAvailableAsync: jest.fn(async () => false),
  signInAsync: jest.fn(),
  AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
  AppleAuthenticationButtonType: { SIGN_IN: 0 },
  AppleAuthenticationButtonStyle: { WHITE: 0, BLACK: 2 },
  AppleAuthenticationButton: () => null,
}));
