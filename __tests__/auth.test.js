import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import apiService from '../src/services/apiService';

beforeEach(async () => {
  await AsyncStorage.clear();
  await apiService.clearTokens();
});

test('на телефоне токены входа лежат в SecureStore, а не в AsyncStorage', async () => {
  await apiService.setAuthToken('access-1');
  await apiService.setRefreshToken('refresh-1');

  expect(SecureStore.setItemAsync).toHaveBeenCalledWith('access_token', 'access-1');
  expect(await AsyncStorage.getItem('access_token')).toBeNull();
  expect(await AsyncStorage.getItem('refresh_token')).toBeNull();
  expect(await apiService.getAuthToken()).toBe('access-1');
  expect(await apiService.getRefreshToken()).toBe('refresh-1');

  await apiService.clearTokens();
  expect(await apiService.getAuthToken()).toBeNull();
  expect(await apiService.getRefreshToken()).toBeNull();
});

describe('вход через Google', () => {
  const { GoogleSignin } = require('@react-native-google-signin/google-signin');
  const authService = require('../src/services/authService').default;
  const { GOOGLE_WEB_CLIENT_ID, GOOGLE_IOS_CLIENT_ID } = require('../src/config/api');
  let calls;
  let reply;

  beforeEach(() => {
    calls = [];
    reply = { status: 200, body: { access: 'jwt-a', refresh: 'jwt-r', user: { id: 37, first_name: 'ТЕСТ' } } };
    GoogleSignin.signIn.mockResolvedValue({ type: 'success', data: { idToken: 'google-id-token' } });
    global.fetch = jest.fn(async (url, options) => {
      calls.push({
        path: url.replace(/^.*\/api\/v1/, ''),
        headers: options.headers,
        body: options.body ? JSON.parse(options.body) : null,
      });
      return {
        status: reply.status,
        ok: reply.status < 400,
        statusText: '',
        headers: { get: () => 'application/json' },
        json: async () => reply.body,
      };
    });
  });

  test('id_token и гостевая корзина уходят на сервер, JWT сохраняются, токен корзины сбрасывается', async () => {
    await AsyncStorage.setItem('cart_token', 'guest-cart');

    const user = await authService.loginWithGoogle();

    expect(GoogleSignin.configure).toHaveBeenCalledWith({ webClientId: GOOGLE_WEB_CLIENT_ID, iosClientId: GOOGLE_IOS_CLIENT_ID });
    expect(calls).toHaveLength(1);
    expect(calls[0].path).toBe('/auth/google/');
    expect(calls[0].body).toEqual({ id_token: 'google-id-token' });
    expect(calls[0].headers['X-Cart-Token']).toBe('guest-cart');
    expect(user).toEqual({ id: 37, first_name: 'ТЕСТ' });
    expect(await apiService.getAuthToken()).toBe('jwt-a');
    expect(await apiService.getRefreshToken()).toBe('jwt-r');
    expect(await AsyncStorage.getItem('cart_token')).toBeNull();
  });

  test('закрыл выбор аккаунта — null, на сервер ничего не уходит', async () => {
    GoogleSignin.signIn.mockResolvedValue({ type: 'cancelled', data: null });
    expect(await authService.loginWithGoogle()).toBeNull();
    expect(calls).toHaveLength(0);
  });

  test('сервер не принял токен (401) — ошибка с его текстом, без попытки обновить JWT', async () => {
    reply = { status: 401, body: { detail: 'Недействительный токен Google' } };
    await expect(authService.loginWithGoogle()).rejects.toMatchObject({
      status: 401,
      message: 'Недействительный токен Google',
    });
    expect(calls.map((c) => c.path)).toEqual(['/auth/google/']);
  });

  test('выход: refresh в чёрный список на сервере, выход из Google, токены стёрты', async () => {
    await apiService.setAuthToken('jwt-a');
    await apiService.setRefreshToken('jwt-r');
    reply = { status: 200, body: {} };

    await authService.logout();

    expect(calls).toHaveLength(1);
    expect(calls[0].path).toBe('/auth/logout/');
    expect(calls[0].body).toEqual({ refresh: 'jwt-r' });
    expect(GoogleSignin.signOut).toHaveBeenCalled();
    expect(await apiService.getAuthToken()).toBeNull();
    expect(await apiService.getRefreshToken()).toBeNull();
  });
});

test('редактирование профиля: PATCH /me/ только с именем и фамилией, ответ сервера — новый user', async () => {
  const { configureStore } = require('@reduxjs/toolkit');
  const authReducer = require('../src/store/slices/authSlice').default;
  const { updateProfile } = require('../src/store/slices/authSlice');
  const sent = [];
  global.fetch = jest.fn(async (url, options) => {
    sent.push({ path: url.replace(/^.*\/api\/v1/, ''), method: options.method, body: JSON.parse(options.body) });
    return {
      status: 200, ok: true, statusText: '',
      headers: { get: () => 'application/json' },
      json: async () => ({ id: 37, first_name: 'Андрей', last_name: '', email: 'a@b.by' }),
    };
  });
  await apiService.setAuthToken('jwt-a');
  const store = configureStore({ reducer: { auth: authReducer } });

  await store.dispatch(updateProfile({ first_name: 'Андрей', last_name: '' })).unwrap();

  expect(sent).toEqual([{ path: '/me/', method: 'PATCH', body: { first_name: 'Андрей', last_name: '' } }]);
  expect(store.getState().auth.user.first_name).toBe('Андрей');
});

describe('удаление аккаунта', () => {
  const { GoogleSignin } = require('@react-native-google-signin/google-signin');
  const authService = require('../src/services/authService').default;
  let sent;
  const mockServer = (status) => {
    sent = [];
    global.fetch = jest.fn(async (url, options) => {
      sent.push({ path: url.replace(/^.*\/api\/v1/, ''), method: options.method });
      return {
        status, ok: status < 400, statusText: '',
        headers: { get: () => (status < 400 ? null : 'application/json') },
        text: async () => '',
        json: async () => ({ detail: 'Ошибка сервера' }),
      };
    });
  };

  beforeEach(async () => {
    await apiService.setAuthToken('jwt-a');
    await apiService.setRefreshToken('jwt-r');
    await AsyncStorage.setItem('user_data', '{"id":37}');
    await AsyncStorage.setItem('cart_token', 'old-cart');
  });

  test('DELETE /me/ → токены, профиль и корзина на телефоне стёрты, доступ Google отозван', async () => {
    mockServer(204);
    await authService.deleteAccount();
    expect(sent).toEqual([{ path: '/me/', method: 'DELETE' }]);
    expect(GoogleSignin.revokeAccess).toHaveBeenCalled();
    expect(await apiService.getAuthToken()).toBeNull();
    expect(await apiService.getRefreshToken()).toBeNull();
    expect(await AsyncStorage.getItem('user_data')).toBeNull();
    expect(await AsyncStorage.getItem('cart_token')).toBeNull();
  });

  test('сервер не удалил — ошибка, вход на телефоне остаётся', async () => {
    mockServer(500);
    await expect(authService.deleteAccount()).rejects.toMatchObject({ status: 500 });
    expect(await apiService.getAuthToken()).toBe('jwt-a');
    expect(await AsyncStorage.getItem('user_data')).toBe('{"id":37}');
  });
});

describe('вход через Apple', () => {
  const AppleAuthentication = require('expo-apple-authentication');
  const authService = require('../src/services/authService').default;
  let calls;

  beforeEach(async () => {
    calls = [];
    await apiService.clearTokens();
    global.fetch = jest.fn(async (url, options) => {
      calls.push({ path: url.replace(/^.*\/api\/v1/, ''), headers: options.headers, body: JSON.parse(options.body) });
      return {
        status: 200, ok: true, statusText: '',
        headers: { get: () => 'application/json' },
        json: async () => ({ access: 'jwt-a', refresh: 'jwt-r', user: { id: 5, first_name: 'Анна' } }),
      };
    });
  });

  test('identity_token и имя (Apple даёт его только при первом входе) уходят на /auth/apple/ с гостевой корзиной', async () => {
    await AsyncStorage.setItem('cart_token', 'guest-cart');
    AppleAuthentication.signInAsync.mockResolvedValue({
      identityToken: 'apple-token',
      authorizationCode: 'apple-code',
      fullName: { givenName: 'Анна', familyName: 'Петрова' },
    });

    const user = await authService.loginWithApple();

    expect(calls).toEqual([{
      path: '/auth/apple/',
      headers: expect.objectContaining({ 'X-Cart-Token': 'guest-cart' }),
      body: { identity_token: 'apple-token', authorization_code: 'apple-code', first_name: 'Анна', last_name: 'Петрова' },
    }]);
    expect(user).toEqual({ id: 5, first_name: 'Анна' });
    expect(await apiService.getAuthToken()).toBe('jwt-a');
    expect(await AsyncStorage.getItem('cart_token')).toBeNull();
  });

  test('закрыл окно Apple — null, на сервер ничего не уходит', async () => {
    AppleAuthentication.signInAsync.mockRejectedValue(Object.assign(new Error('canceled'), { code: 'ERR_REQUEST_CANCELED' }));
    expect(await authService.loginWithApple()).toBeNull();
    expect(calls).toHaveLength(0);
  });
});
