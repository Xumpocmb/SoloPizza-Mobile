import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, DEFAULT_HEADERS, REQUEST_TIMEOUT } from '../config/api';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.timeout = REQUEST_TIMEOUT;
  }

  // Get stored auth token
  async getAuthToken() {
    try {
      const token = await AsyncStorage.getItem('access_token');
      return token;
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }

  // Set auth token
  async setAuthToken(token) {
    try {
      await AsyncStorage.setItem('access_token', token);
    } catch (error) {
      console.error('Error setting auth token:', error);
    }
  }

  // Remove auth token
  async removeAuthToken() {
    try {
      await AsyncStorage.removeItem('access_token');
    } catch (error) {
      console.error('Error removing auth token:', error);
    }
  }

  // Get refresh token
  async getRefreshToken() {
    try {
      const token = await AsyncStorage.getItem('refresh_token');
      return token;
    } catch (error) {
      console.error('Error getting refresh token:', error);
      return null;
    }
  }

  // Set refresh token
  async setRefreshToken(token) {
    try {
      await AsyncStorage.setItem('refresh_token', token);
    } catch (error) {
      console.error('Error setting refresh token:', error);
    }
  }

  // Build headers with authentication
  async buildHeaders(customHeaders = {}) {
    const headers = { ...DEFAULT_HEADERS, ...customHeaders };
    
    const token = await this.getAuthToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    
    return headers;
  }

  // Refresh access token
  async refreshAccessToken() {
    try {
      const refreshToken = await this.getRefreshToken();
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await this.makeRequest('/auth/token/refresh/', {
        method: 'POST',
        body: JSON.stringify({ refresh: refreshToken }),
        headers: DEFAULT_HEADERS,
      });

      if (response.access) {
        await this.setAuthToken(response.access);
        return response.access;
      }
      
      throw new Error('Failed to refresh token');
    } catch (error) {
      console.error('Token refresh failed:', error);
      // Clear tokens on refresh failure
      await this.removeAuthToken();
      await AsyncStorage.removeItem('refresh_token');
      throw error;
    }
  }

  // Make HTTP request with timeout and error handling
  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const timeoutMs = options.timeout ?? this.timeout;

    const requestOptions = {
      ...options,
      headers: await this.buildHeaders(options.headers),
    };

    // 02.11.2026, дефект №1 из памяти агента: таймер таймаута ОБЯЗАН очищаться
    // после исхода race. Раньше он жил вечно: после успешного ответа setTimeout
    // всё равно срабатывал и реджектил промис без обработчика → unhandled
    // rejection (жёлтый/красный бокс LogBox в debug-сборке). Теперь у запроса
    // один AbortController: по таймауту fetch отменяется по-настоящему,
    // а clearTimeout вызывается в finally независимо от исхода.
    const send = (opts) => {
      const controller = new AbortController();
      let timer = null;
      const timeoutPromise = new Promise((_, reject) => {
        timer = setTimeout(() => {
          // сначала отчёт о таймауте (race settles им), ПОТОМ отмена сокета:
          // иначе abort-редект fetch успевал первым и маска ошибки терялась
          reject(new Error('Request timeout'));
          controller.abort();
        }, timeoutMs);
      });
      return Promise.race([
        fetch(url, { ...opts, signal: controller.signal }),
        timeoutPromise,
      ]).finally(() => clearTimeout(timer));
    };

    try {
      const response = await send(requestOptions);

      // Handle 401 Unauthorized - try to refresh token
      if (response.status === 401 && endpoint !== '/auth/token/refresh/') {
        try {
          await this.refreshAccessToken();
          // Retry the original request with new token
          const newHeaders = await this.buildHeaders(options.headers);
          const retryResponse = await send({ ...requestOptions, headers: newHeaders });
          return await this.handleResponse(retryResponse);
        } catch (refreshError) {
          throw new Error('Authentication failed');
        }
      }

      return await this.handleResponse(response);
    } catch (error) {
      // silent: ожидаемые сбои (демо-режим) не spam'ят console.error,
      // иначе LogBox в debug-сборке показывает красные тосты на каждый запрос
      if (!options.silent) {
        console.error('API Request failed:', error);
      }
      throw this.handleError(error);
    }
  }

  // Handle response
  async handleResponse(response) {
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      
      if (!response.ok) {
        throw {
          status: response.status,
          message: data.message || data.detail || 'Request failed',
          data: data,
        };
      }
      
      return data;
    } else {
      if (!response.ok) {
        throw {
          status: response.status,
          message: `HTTP ${response.status}: ${response.statusText}`,
        };
      }
      
      return await response.text();
    }
  }

  // Handle errors
  handleError(error) {
    if (error.name === 'TypeError' && error.message === 'Network request failed') {
      return {
        status: 0,
        message: 'Проблемы с подключением к интернету',
        isNetworkError: true,
      };
    }
    
    if (error.message === 'Request timeout') {
      return {
        status: 0,
        message: 'Превышено время ожидания запроса',
        isTimeoutError: true,
      };
    }
    
    return error;
  }

  // Convenience methods
  async get(endpoint, params = {}, reqOptions = {}) {
    const queryString = Object.keys(params).length 
      ? '?' + new URLSearchParams(params).toString()
      : '';
    
    return this.makeRequest(`${endpoint}${queryString}`, {
      method: 'GET',
      ...reqOptions,
    });
  }

  async post(endpoint, data = {}) {
    return this.makeRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put(endpoint, data = {}) {
    return this.makeRequest(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async patch(endpoint, data = {}) {
    return this.makeRequest(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async delete(endpoint) {
    return this.makeRequest(endpoint, {
      method: 'DELETE',
    });
  }
}

// Export singleton instance
export default new ApiService();