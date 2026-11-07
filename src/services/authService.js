import apiService from './apiService';
import { API_ENDPOINTS } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

class AuthService {
  /**
   * Login user.
   *
   * ИСПРАВЛЕНО ПРИ АУДИТЕ: была сигнатура login(email, password),
   * но LoginScreen вызывает её ОДНИМ ОБЪЕКТОМ:
   *   authService.login({ email, password, remember_me })
   * → в password попадал undefined → «Неверный email или пароль» всегда.
   *
   * Теперь поддерживаются оба варианта вызова.
   *
   * @param {Object|string} emailOrPayload — { email, password, remember_me } либо email строкой
   * @param {string} [password]
   */
  async login(emailOrPayload, password) {
    const payload =
      typeof emailOrPayload === 'string'
        ? { email: emailOrPayload, password }
        : { ...emailOrPayload };

    try {
      const response = await apiService.post(API_ENDPOINTS.AUTH.LOGIN, payload);

      if (response.access && response.refresh) {
        await apiService.setAuthToken(response.access);
        await apiService.setRefreshToken(response.refresh);
        
        // Store user data if provided
        if (response.user) {
          await AsyncStorage.setItem('user_data', JSON.stringify(response.user));
        }
      }

      return response;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  // Register new user
  async register(userData) {
    try {
      const response = await apiService.post(API_ENDPOINTS.AUTH.REGISTER, userData);
      
      if (response.access && response.refresh) {
        await apiService.setAuthToken(response.access);
        await apiService.setRefreshToken(response.refresh);
        
        if (response.user) {
          await AsyncStorage.setItem('user_data', JSON.stringify(response.user));
        }
      }

      return response;
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  }

  // Logout user
  async logout() {
    try {
      await apiService.removeAuthToken();
      await AsyncStorage.removeItem('refresh_token');
      await AsyncStorage.removeItem('user_data');
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  // Get user profile
  async getProfile() {
    try {
      const response = await apiService.get(API_ENDPOINTS.AUTH.PROFILE);
      
      if (response) {
        await AsyncStorage.setItem('user_data', JSON.stringify(response));
      }
      
      return response;
    } catch (error) {
      console.error('Get profile failed:', error);
      throw error;
    }
  }

  // Update user profile
  async updateProfile(userData) {
    try {
      const response = await apiService.patch(API_ENDPOINTS.AUTH.PROFILE, userData);
      
      if (response) {
        await AsyncStorage.setItem('user_data', JSON.stringify(response));
      }
      
      return response;
    } catch (error) {
      console.error('Update profile failed:', error);
      throw error;
    }
  }

  // Check if user is authenticated
  async isAuthenticated() {
    try {
      const token = await apiService.getAuthToken();
      if (!token) return false;

      // Verify token with server
      await apiService.post(API_ENDPOINTS.AUTH.TOKEN_VERIFY, {
        token,
      });
      
      return true;
    } catch (error) {
      console.error('Token verification failed:', error);
      return false;
    }
  }

  // Get stored user data
  async getStoredUserData() {
    try {
      const userData = await AsyncStorage.getItem('user_data');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error getting stored user data:', error);
      return null;
    }
  }

  // Refresh tokens
  async refreshTokens() {
    try {
      const refreshToken = await apiService.getRefreshToken();
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await apiService.post(API_ENDPOINTS.AUTH.TOKEN_REFRESH, {
        refresh: refreshToken,
      });

      if (response.access) {
        await apiService.setAuthToken(response.access);
        
        // Update refresh token if provided
        if (response.refresh) {
          await apiService.setRefreshToken(response.refresh);
        }
      }

      return response;
    } catch (error) {
      console.error('Token refresh failed:', error);
      // Clear all tokens on failure
      await this.logout();
      throw error;
    }
  }

  // ───────────────────────────────────────────────────────────
  // ДОБАВЛЕНО ПРИ АУДИТЕ 31.10.2026
  // LoginScreen вызывает эти три метода, но их не было →
  // «authService.storeTokens is not a function» на каждом входе.
  // ───────────────────────────────────────────────────────────

  /**
   * Сохранить пару токенов.
   * ⚠️ Ключи ОБЯЗАНЫ совпадать с теми, что читает apiService:
   *    'access_token' и 'refresh_token'.
   *    В authSlice использовались 'accessToken'/'refreshToken' — это был
   *    рассинхрон, из-за которого запросы уходили без заголовка Authorization.
   * @param {string} accessToken
   * @param {string} refreshToken
   */
  async storeTokens(accessToken, refreshToken) {
    try {
      if (accessToken) await apiService.setAuthToken(accessToken);
      if (refreshToken) await apiService.setRefreshToken(refreshToken);
    } catch (error) {
      console.error('Error storing tokens:', error);
    }
  }

  /**
   * Сохранить объект пользователя локально.
   * @param {Object} userData
   */
  async storeUserData(userData) {
    try {
      if (userData) {
        await AsyncStorage.setItem('user_data', JSON.stringify(userData));
      }
    } catch (error) {
      console.error('Error storing user data:', error);
    }
  }

  /**
   * Запросить письмо для восстановления пароля.
   * LoginScreen → handleForgotPassword().
   * @param {{email: string}} data
   */
  async resetPassword(data) {
    return apiService.post(API_ENDPOINTS.USER.RESET_PASSWORD, data);
  }
}

export default new AuthService();