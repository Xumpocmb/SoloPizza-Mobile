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
