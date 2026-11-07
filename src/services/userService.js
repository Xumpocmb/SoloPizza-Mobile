/**
 * User service
 *
 * СОЗДАН ПРИ АУДИТЕ 31.10.2026.
 *
 * Зачем: CheckoutScreen вызывает `userService.getProfile()` и
 * `userService.getAddresses()`, ProfileScreen — `userService.getStats()`.
 * Сервис не существовал → TypeError на обоих экранах.
 *
 * Разделение ответственности:
 *   authService  — вход/регистрация/токены/смена пароля
 *   userService  — данные профиля, адреса доставки, статистика пользователя
 *
 * ⚠️ Эндпоинты ADDRESSES и STATS на бэкенде пока не реализованы
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

  /**
   * Статистика пользователя для экрана профиля.
   * ProfileScreen ожидает форму вида:
   *   { orders_count, total_spent, bonus_points, ... }
   * При недоступном API возвращаем нули — экран отрисуется пустыми значениями
   * вместо падения.
   * @returns {Promise<Object>}
   */
  async getStats() {
    // 02.11.2026, дефект №14: /user/stats/ на бэкенде нет, запрос уходил в 404
    // и красным console.error на каждом открытии Профиля. Не делаем запрос,
    // пока эндпоинт не задеплоен (USER_API_ENABLED=false) или пользователь
    // не вошёл: статистика гостя бессмысленна. Экран получает нули.
    const token = await apiService.getAuthToken();
    if (!USER_API_ENABLED || !token) {
      return { orders_count: 0, total_spent: 0, bonus_points: 0 };
    }
    try {
      const data = await apiService.get(API_ENDPOINTS.USER.STATS, {}, { silent: true });
      return {
        orders_count: data?.orders_count ?? 0,
        total_spent: data?.total_spent ?? 0,
        bonus_points: data?.bonus_points ?? 0,
        ...data,
      };
    } catch (error) {
      if (__DEV__) {
        console.warn('[userService] getStats недоступен:', error?.message || error);
      }
      return { orders_count: 0, total_spent: 0, bonus_points: 0 };
    }
  }

  /**
   * Изменить пароль.
   * @param {{old_password: string, new_password: string}} data
   */
  async changePassword(data) {
    return apiService.post(API_ENDPOINTS.USER.CHANGE_PASSWORD, data);
  }
}

export default new UserService();
