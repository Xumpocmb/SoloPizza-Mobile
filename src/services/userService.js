/**
 * User service
 *
 * СОЗДАН ПРИ АУДИТЕ 31.10.2026.
 *
 * Зачем: CheckoutScreen вызывает `userService.getProfile()` и
 * `userService.getAddresses()`.
 * Сервис не существовал → TypeError на обоих экранах.
 *
 * Разделение ответственности:
 *   authService  — вход/регистрация/токены/смена пароля
 *   userService  — данные профиля, адреса доставки, статистика пользователя
 *
 * ⚠️ Эндпоинта ADDRESSES на бэкенде пока нет
 * (на solo-pizza.by вообще нет REST API). Методы написаны так, чтобы
 * не ронять экран: при ошибке возвращают безопасное пустое значение.
 * getProfile() ошибку пробрасывает — профиль действительно критичен.
 */

import apiService from './apiService';
import { API_ENDPOINTS, USER_API_ENABLED } from '../config/api';

function toArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.results)) return payload.results;
  return [];
}

class UserService {
  /**
   * Профиль текущего пользователя.
   * @returns {Promise<Object>}
   */
  async getProfile() {
    return apiService.get(API_ENDPOINTS.USER.PROFILE);
  }

  /**
   * Обновить профиль.
   * @param {Object} data — { first_name, last_name, phone, ... }
   */
  async updateProfile(data) {
    return apiService.patch(API_ENDPOINTS.USER.PROFILE, data);
  }

  /**
   * Список адресов доставки.
   * CheckoutScreen ожидает массив; при ошибке возвращаем [],
   * чтобы экран просто не показал сохранённые адреса.
   * @returns {Promise<Array>}
   */
  async getAddresses() {
    // 02.11.2026: эндпоинта адресов на бэкенде нет, гостю адреса не нужны —
    // не делаем запрос вовсе, пока нет токена входа или флага USER_API_ENABLED
    const token = await apiService.getAuthToken();
    if (!USER_API_ENABLED || !token) {
      return [];
    }
    try {
      return toArray(await apiService.get(API_ENDPOINTS.USER.ADDRESSES, {}, { silent: true }));
    } catch (error) {
      if (__DEV__) {
        console.warn('[userService] getAddresses недоступен:', error?.message || error);
      }
      return [];
    }
  }

  /** Создать адрес доставки. */
  async addAddress(data) {
    return apiService.post(API_ENDPOINTS.USER.ADDRESSES, data);
  }

  /** Удалить адрес доставки. */
  async deleteAddress(addressId) {
    return apiService.delete(`${API_ENDPOINTS.USER.ADDRESSES}${addressId}/`);
  }

}

export default new UserService();
